"""
Hackathon Controller.
Handles Hackathon Creation, Team Ingestion (CSV, Webhook, Direct), Submissions, Judging Queue, Finalize Rankings, and Top Performers Feed.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import (
    AgentRun,
    Assessment,
    CandidateProfile,
    Event,
    Hackathon,
    HackathonRanking,
    HackathonSubmission,
    HackathonTeam,
    HackathonTeamMember,
    PlagiarismMatch,
    PresentationScore,
    RecruiterWatchlist,
    Submission,
    User,
)
from packages.shared_schemas.hackathon import (
    CSVImportRequest,
    CSVImportResponse,
    CSVImportRowError,
    FinalizeRankingsRequest,
    FinalizeRankingsResponse,
    HackathonCreateRequest,
    HackathonResponse,
    JudgeQueueEntry,
    JudgeScoreRequest,
    RankingResponse,
    SubmissionResponse,
    TeamDetailResponse,
    TeamMemberResponse,
    TeamResponse,
    TeamSubmissionInput,
    TopPerformerEntry,
    TopPerformersFeedResponse,
    WatchlistCreateRequest,
    WatchlistResponse,
)
from services.agents.hackathon.graph import get_hackathon_ranking_graph
from services.agents.hackathon.state import HackathonRankingState
from services.agents.hackathon.tools.normalization import NormalizationUnavailable, normalize_webhook_payload
from services.api.core.config import get_settings
from services.api.core.db import get_db
from services.api.core.event_consumer import get_matching_top_performers_for_recruiter
from services.api.core.rbac import require_role
from services.api.core.tracing import start_agent_trace

router = APIRouter(tags=["Hackathons & Top Performers"])


async def _get_hackathon_or_404(db: AsyncSession, hackathon_id: uuid.UUID) -> Hackathon:
    result = await db.execute(select(Hackathon).where(Hackathon.id == hackathon_id))
    hackathon = result.scalar_one_or_none()
    if hackathon is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="hackathon_not_found")
    return hackathon


async def _upsert_team(db: AsyncSession, hackathon_id: uuid.UUID, team_input: TeamSubmissionInput) -> tuple[HackathonTeam, int]:
    existing = await db.execute(
        select(HackathonTeam).where(
            HackathonTeam.hackathon_id == hackathon_id,
            HackathonTeam.team_name == team_input.team_name,
        )
    )
    team = existing.scalar_one_or_none()
    if team is None:
        team = HackathonTeam(hackathon_id=hackathon_id, team_name=team_input.team_name, track=team_input.track)
        db.add(team)
        await db.flush()
    else:
        team.track = team_input.track or team.track

    existing_members = await db.execute(
        select(HackathonTeamMember).where(HackathonTeamMember.team_id == team.id)
    )
    for m in existing_members.scalars().all():
        await db.delete(m)
    await db.flush()

    members_created = 0
    for member_input in team_input.members:
        candidate_id = None
        if member_input.github_username:
            profile_result = await db.execute(
                select(CandidateProfile).where(CandidateProfile.github_username == member_input.github_username)
            )
            profile = profile_result.scalar_one_or_none()
            candidate_id = profile.id if profile else None
        db.add(
            HackathonTeamMember(
                team_id=team.id,
                candidate_id=candidate_id,
                github_username=member_input.github_username,
                display_name=member_input.display_name,
                role=member_input.role or "member",
            )
        )
        members_created += 1

    if team_input.repo_url or team_input.presentation_id or team_input.judge_score is not None:
        submission_result = await db.execute(
            select(HackathonSubmission).where(HackathonSubmission.team_id == team.id)
        )
        submission = submission_result.scalar_one_or_none()
        if submission is None:
            submission = HackathonSubmission(team_id=team.id)
            db.add(submission)
        submission.repo_url = team_input.repo_url or submission.repo_url
        submission.presentation_id = team_input.presentation_id or submission.presentation_id
        if team_input.judge_score is not None:
            submission.judge_score = team_input.judge_score

    await db.flush()
    return team, members_created


@router.post("/hackathons", response_model=HackathonResponse, status_code=status.HTTP_201_CREATED)
async def create_hackathon(
    body: HackathonCreateRequest,
    user: User = Depends(require_role("organizer")),
    db: AsyncSession = Depends(get_db),
) -> Hackathon:
    hackathon = Hackathon(
        organizer_org_id=user.organization_id,
        organizer_user_id=user.id,
        name=body.name,
        start_date=body.start_date,
        end_date=body.end_date,
        tracks=body.tracks,
        ingestion_mode=body.ingestion_mode,
    )
    db.add(hackathon)
    await db.commit()
    await db.refresh(hackathon)
    return hackathon


@router.get("/hackathons", response_model=list[HackathonResponse])
async def list_my_hackathons(
    user: User = Depends(require_role("organizer")),
    db: AsyncSession = Depends(get_db),
) -> list[Hackathon]:
    result = await db.execute(
        select(Hackathon).where(Hackathon.organizer_user_id == user.id).order_by(Hackathon.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/hackathons/open", response_model=list[HackathonResponse])
async def list_open_hackathons(
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> list[Hackathon]:
    result = await db.execute(
        select(Hackathon).where(Hackathon.status.in_(["draft", "active"])).order_by(Hackathon.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/hackathons/{hackathon_id}", response_model=HackathonResponse)
async def get_hackathon(hackathon_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Hackathon:
    return await _get_hackathon_or_404(db, hackathon_id)


@router.post("/hackathons/{hackathon_id}/import/csv", response_model=CSVImportResponse, status_code=status.HTTP_201_CREATED)
async def import_csv(
    hackathon_id: uuid.UUID,
    body: CSVImportRequest,
    user: User = Depends(require_role("organizer")),
    db: AsyncSession = Depends(get_db),
) -> CSVImportResponse:
    await _get_hackathon_or_404(db, hackathon_id)

    teams_created = 0
    members_created = 0
    row_errors: list[CSVImportRowError] = []
    seen_names: set[str] = set()

    for idx, team_input in enumerate(body.teams):
        if not team_input.team_name.strip():
            row_errors.append(CSVImportRowError(row_index=idx, team_name=None, error="missing_team_name"))
            continue
        if team_input.team_name in seen_names:
            row_errors.append(
                CSVImportRowError(row_index=idx, team_name=team_input.team_name, error="duplicate_team_name_in_import")
            )
            continue
        seen_names.add(team_input.team_name)
        try:
            _, member_count = await _upsert_team(db, hackathon_id, team_input)
            teams_created += 1
            members_created += member_count
        except Exception as exc:
            row_errors.append(CSVImportRowError(row_index=idx, team_name=team_input.team_name, error=str(exc)))

    await db.commit()
    return CSVImportResponse(teams_created=teams_created, members_created=members_created, row_errors=row_errors)


@router.post("/hackathons/{hackathon_id}/webhook", status_code=status.HTTP_201_CREATED)
async def receive_webhook(
    hackathon_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
) -> TeamResponse:
    await _get_hackathon_or_404(db, hackathon_id)
    try:
        team_input = normalize_webhook_payload(body)
    except NormalizationUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    team, _ = await _upsert_team(db, hackathon_id, team_input)
    await db.commit()
    await db.refresh(team)
    return team


@router.post("/hackathons/{hackathon_id}/submissions", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def submit_direct(
    hackathon_id: uuid.UUID,
    body: TeamSubmissionInput,
    user: User = Depends(require_role("candidate")),
    db: AsyncSession = Depends(get_db),
) -> HackathonTeam:
    await _get_hackathon_or_404(db, hackathon_id)
    team, _ = await _upsert_team(db, hackathon_id, body)
    await db.commit()
    await db.refresh(team)
    return team


@router.get("/hackathons/{hackathon_id}/teams", response_model=list[TeamResponse])
async def list_teams(hackathon_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> list[HackathonTeam]:
    await _get_hackathon_or_404(db, hackathon_id)
    result = await db.execute(
        select(HackathonTeam).where(HackathonTeam.hackathon_id == hackathon_id).order_by(HackathonTeam.created_at)
    )
    return list(result.scalars().all())


async def _team_or_404(db: AsyncSession, hackathon_id: uuid.UUID, team_id: uuid.UUID) -> HackathonTeam:
    result = await db.execute(
        select(HackathonTeam).where(HackathonTeam.id == team_id, HackathonTeam.hackathon_id == hackathon_id)
    )
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="team_not_found")
    return team


@router.get("/hackathons/{hackathon_id}/teams/{team_id}", response_model=TeamDetailResponse)
async def get_team_detail(
    hackathon_id: uuid.UUID, team_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> TeamDetailResponse:
    team = await _team_or_404(db, hackathon_id, team_id)

    members_result = await db.execute(select(HackathonTeamMember).where(HackathonTeamMember.team_id == team.id))
    members = list(members_result.scalars().all())

    submission_result = await db.execute(select(HackathonSubmission).where(HackathonSubmission.team_id == team.id))
    submission = submission_result.scalar_one_or_none()

    ranking_result = await db.execute(
        select(HackathonRanking).where(
            HackathonRanking.hackathon_id == hackathon_id, HackathonRanking.team_id == team.id
        )
    )
    ranking = ranking_result.scalar_one_or_none()

    return TeamDetailResponse(
        team=TeamResponse.model_validate(team),
        members=[TeamMemberResponse.model_validate(m) for m in members],
        submission=SubmissionResponse.model_validate(submission) if submission else None,
        ranking=RankingResponse.model_validate(ranking) if ranking else None,
    )


@router.get("/judging/queue", response_model=list[JudgeQueueEntry])
async def judging_queue(
    user: User = Depends(require_role("judge")),
    db: AsyncSession = Depends(get_db),
) -> list[JudgeQueueEntry]:
    result = await db.execute(
        select(HackathonSubmission, HackathonTeam, Hackathon)
        .join(HackathonTeam, HackathonSubmission.team_id == HackathonTeam.id)
        .join(Hackathon, HackathonTeam.hackathon_id == Hackathon.id)
        .order_by(HackathonSubmission.submitted_at.desc())
    )
    return [
        JudgeQueueEntry(
            submission_id=submission.id,
            hackathon_id=hackathon.id,
            hackathon_name=hackathon.name,
            team_id=team.id,
            team_name=team.team_name,
            repo_url=submission.repo_url,
            presentation_id=submission.presentation_id,
            judge_score=submission.judge_score,
            judge_rationale=submission.judge_rationale,
        )
        for submission, team, hackathon in result.all()
    ]


@router.post("/hackathons/{hackathon_id}/submissions/{submission_id}/judge-score", response_model=SubmissionResponse)
async def submit_judge_score(
    hackathon_id: uuid.UUID,
    submission_id: uuid.UUID,
    body: JudgeScoreRequest,
    user: User = Depends(require_role("judge")),
    db: AsyncSession = Depends(get_db),
) -> HackathonSubmission:
    result = await db.execute(
        select(HackathonSubmission)
        .join(HackathonTeam, HackathonSubmission.team_id == HackathonTeam.id)
        .where(HackathonSubmission.id == submission_id, HackathonTeam.hackathon_id == hackathon_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="submission_not_found")

    submission.judge_score = body.score
    submission.judge_rationale = body.rationale
    submission.judge_user_id = user.id
    await db.commit()
    await db.refresh(submission)
    return submission


async def _resolve_repo_candidate(db: AsyncSession, member_candidate_ids: list[uuid.UUID]) -> uuid.UUID | None:
    return member_candidate_ids[0] if member_candidate_ids else None


@router.post("/hackathons/{hackathon_id}/rankings/finalize", response_model=FinalizeRankingsResponse)
async def finalize_rankings(
    hackathon_id: uuid.UUID,
    body: FinalizeRankingsRequest | None = None,
    user: User = Depends(require_role("organizer")),
    db: AsyncSession = Depends(get_db),
) -> FinalizeRankingsResponse:
    hackathon = await _get_hackathon_or_404(db, hackathon_id)

    teams_result = await db.execute(select(HackathonTeam).where(HackathonTeam.hackathon_id == hackathon_id))
    teams = list(teams_result.scalars().all())
    if not teams:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no_teams_to_rank")

    team_states: list[dict] = []
    for team in teams:
        submission_result = await db.execute(
            select(HackathonSubmission).where(HackathonSubmission.team_id == team.id)
        )
        submission = submission_result.scalar_one_or_none()

        members_result = await db.execute(
            select(HackathonTeamMember).where(HackathonTeamMember.team_id == team.id)
        )
        members = list(members_result.scalars().all())
        member_candidate_ids = [str(m.candidate_id) for m in members if m.candidate_id is not None]

        repo_score = None
        if submission and submission.repo_analysis_submission_id:
            existing_submission = await db.execute(
                select(Submission).where(Submission.id == submission.repo_analysis_submission_id)
            )
            row = existing_submission.scalar_one_or_none()
            repo_score = row.score if row else None

        pitch_score = None
        plagiarism_similarities: list[float] = []
        if submission and submission.presentation_id:
            score_result = await db.execute(
                select(PresentationScore)
                .where(PresentationScore.presentation_id == submission.presentation_id)
                .order_by(PresentationScore.computed_at.desc())
                .limit(1)
            )
            score_row = score_result.scalar_one_or_none()
            pitch_score = score_row.overall_pitch_score if score_row else None

            matches_result = await db.execute(
                select(PlagiarismMatch.similarity).where(
                    PlagiarismMatch.presentation_id == submission.presentation_id
                )
            )
            plagiarism_similarities = [row[0] for row in matches_result.all()]

        team_states.append(
            {
                "team_id": str(team.id),
                "repo_url": submission.repo_url if submission else None,
                "presentation_id": str(submission.presentation_id) if submission and submission.presentation_id else None,
                "judge_score": submission.judge_score if submission else None,
                "repo_score": repo_score,
                "pitch_score": pitch_score,
                "plagiarism_similarities": plagiarism_similarities,
                "member_candidate_ids": member_candidate_ids,
            }
        )

    initial_state: HackathonRankingState = {
        "hackathon_id": str(hackathon_id),
        "teams": team_states,
        "repo_scores": {},
        "repo_verification_results": {},
        "novelty_scores": {},
        "final_rankings": [],
        "notification_event_payload": None,
    }
    with start_agent_trace(
        "hackathon.ranking_finalize",
        input_data={"hackathon_id": str(hackathon_id), "team_count": len(teams)},
        user_id=str(user.id),
        tags=["hackathon", "ranking"],
    ) as trace:
        result_state = await get_hackathon_ranking_graph().ainvoke(initial_state)
        trace.update(output={"final_rankings": result_state["final_rankings"]})

    teams_by_id = {str(t.id): t for t in teams}
    for team_id_str, verification in result_state["repo_verification_results"].items():
        team = teams_by_id[team_id_str]
        team_state = next(t for t in team_states if t["team_id"] == team_id_str)
        candidate_id = await _resolve_repo_candidate(db, [uuid.UUID(c) for c in team_state["member_candidate_ids"]])
        if candidate_id is None:
            continue

        assessment = Assessment(type="project_analysis", spec={})
        db.add(assessment)
        await db.flush()
        analysis_submission = Submission(
            assessment_id=assessment.id,
            candidate_id=candidate_id,
            code_or_answers={"repo_full_name": verification["repo_full_name"]},
            static_analysis=verification["static_analysis"],
            llm_review=verification["llm_review"],
            score=verification["score"],
        )
        db.add(analysis_submission)
        await db.flush()

        submission_result = await db.execute(select(HackathonSubmission).where(HackathonSubmission.team_id == team.id))
        submission_row = submission_result.scalar_one_or_none()
        if submission_row:
            submission_row.repo_analysis_submission_id = analysis_submission.id

    rankings: list[HackathonRanking] = []
    for entry in result_state["final_rankings"]:
        team_id = uuid.UUID(entry["team_id"])
        existing = await db.execute(
            select(HackathonRanking).where(
                HackathonRanking.hackathon_id == hackathon_id, HackathonRanking.team_id == team_id
            )
        )
        ranking_row = existing.scalar_one_or_none()
        if ranking_row is None:
            ranking_row = HackathonRanking(hackathon_id=hackathon_id, team_id=team_id)
            db.add(ranking_row)
        ranking_row.rank = entry["rank"]
        ranking_row.composite_score = entry["composite_score"] if entry["composite_score"] is not None else 0.0
        ranking_row.score_breakdown = entry["score_breakdown"]
        ranking_row.finalized_at = datetime.now(timezone.utc)
        rankings.append(ranking_row)

    hackathon.status = "finalized"

    settings = get_settings()
    hackathon_ranking_input = {"team_count": len(teams)}
    hackathon_ranking_output = {"final_rankings": result_state["final_rankings"]}
    db.add(
        AgentRun(
            agent_name="hackathon_ranking_agent",
            subject_type="hackathon",
            subject_id=hackathon_id,
            input_ref=hackathon_ranking_input,
            output=hackathon_ranking_output,
            model_used=settings.llm_model_judgment,
            langfuse_trace_id=trace.trace_id,
        )
    )
    db.add(Event(event_type="hackathon.rankings.finalized", payload=result_state["notification_event_payload"]))

    await db.commit()
    for r in rankings:
        await db.refresh(r)

    team_names = {str(t.id): t.team_name for t in teams}
    return FinalizeRankingsResponse(
        hackathon_id=hackathon_id,
        rankings=[
            RankingResponse(
                id=r.id,
                hackathon_id=r.hackathon_id,
                team_id=r.team_id,
                team_name=team_names.get(str(r.team_id)),
                rank=r.rank,
                composite_score=r.composite_score,
                score_breakdown=r.score_breakdown,
                finalized_at=r.finalized_at,
            )
            for r in sorted(rankings, key=lambda r: r.rank)
        ],
    )


@router.get("/hackathons/{hackathon_id}/rankings", response_model=list[RankingResponse])
async def get_rankings(hackathon_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> list[RankingResponse]:
    await _get_hackathon_or_404(db, hackathon_id)
    result = await db.execute(
        select(HackathonRanking, HackathonTeam)
        .join(HackathonTeam, HackathonRanking.team_id == HackathonTeam.id)
        .where(HackathonRanking.hackathon_id == hackathon_id)
        .order_by(HackathonRanking.rank)
    )
    return [
        RankingResponse(
            id=ranking.id,
            hackathon_id=ranking.hackathon_id,
            team_id=ranking.team_id,
            team_name=team.team_name,
            rank=ranking.rank,
            composite_score=ranking.composite_score,
            score_breakdown=ranking.score_breakdown,
            finalized_at=ranking.finalized_at,
        )
        for ranking, team in result.all()
    ]


@router.post("/recruiters/me/watchlists", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    body: WatchlistCreateRequest,
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> RecruiterWatchlist:
    watchlist = RecruiterWatchlist(
        recruiter_id=user.id,
        criteria={"track": body.track, "min_rank": body.min_rank, "skills": body.skills},
    )
    db.add(watchlist)
    await db.commit()
    await db.refresh(watchlist)
    return watchlist


@router.get("/recruiters/me/top-performers-feed", response_model=TopPerformersFeedResponse)
async def top_performers_feed(
    user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db),
) -> TopPerformersFeedResponse:
    entries = await get_matching_top_performers_for_recruiter(db, user.id)
    return TopPerformersFeedResponse(entries=[TopPerformerEntry(**e) for e in entries])

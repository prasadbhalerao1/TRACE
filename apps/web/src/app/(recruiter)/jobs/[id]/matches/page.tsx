"use client";

import { Page, PageHeader } from "@/components/common/PageHeader";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/CardListSkeleton";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import {
  fetchJobMatches,
  fetchMatchingStatus,
  type MatchingStatusResponse,
} from "@/lib/api";

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value === null ? "—" : `${value.toFixed(0)}/100`}
      </span>
    </div>
  );
}

export default function RecruiterMatchesPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();

  const fetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchJobMatches(token, params.id);
  }, [getToken, params.id]);
  const {
    data: matches,
    error,
    retry,
  } = useAsyncResource(fetcher, `job-matches:${params.id}`);

  // Without this the page showed a permanent "no candidates yet" message while matching
  // was still running in the background (or had failed outright). Poll the job's matching
  // status and re-fetch the match list once it finishes.
  const [matchingStatus, setMatchingStatus] =
    useState<MatchingStatusResponse | null>(null);
  // `retry` gets a new identity every render, so depending on it directly would restart
  // the poll loop constantly. Held in a ref instead — written in an effect rather than
  // during render, since a render-phase ref write is not safe under concurrent rendering
  // (React may render without committing, leaving the ref pointing at a discarded pass).
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let wasProcessing = false;

    const poll = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const status = await fetchMatchingStatus(token, params.id);
        if (cancelled) return;
        setMatchingStatus(status);
        if (status.status === "processing") {
          wasProcessing = true;
          timer = setTimeout(poll, 3000);
        } else if (wasProcessing) {
          // Matching just finished — pull the newly persisted rows in.
          retryRef.current();
        }
      } catch {
        // Status is supplementary: a failure here must not blank out the match list.
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [getToken, params.id]);

  const isProcessing = matchingStatus?.status === "processing";

  return (
    <Page>
      <PageHeader
        title="Matches"
        // "the full 4-term score breakdown" described the implementation. What a
        // recruiter needs to know is that no ranking is shown without its reasons.
        description="Candidates ranked against this role. Every score is shown with the evidence behind it, never as a bare percentage."
        actions={
          <Button
            render={<Link href={`/pipeline/${params.id}`} />}
            variant="outline"
          >
            View pipeline
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Matched Candidates
            </CardTitle>
            {/* Was the raw formula and an internal doc reference. The four
                components are already listed per candidate below. */}
            <CardDescription>
              Ranked on skill overlap, semantic similarity, experience and
              talent-score alignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!error && matches === null && <CardListSkeleton />}
            {matches !== null && matches.length === 0 && isProcessing && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Matching candidates against this role… this can take a moment.
                </p>
                <CardListSkeleton />
              </div>
            )}
            {matches !== null &&
              matches.length === 0 &&
              matchingStatus?.status === "failed" && (
                <p className="text-sm text-destructive">
                  Matching failed
                  {matchingStatus.error ? `: ${matchingStatus.error}` : "."} Try
                  recomputing from the job page.
                </p>
              )}
            {matches !== null &&
              matches.length === 0 &&
              !isProcessing &&
              matchingStatus?.status !== "failed" && (
                <p className="text-sm text-muted-foreground">
                  No candidates in the pool yet — matches will populate as
                  candidates onboard.
                </p>
              )}
            {matches?.map((match) => (
              <Card
                key={match.id}
                className="hover:border-primary transition-all"
              >
                <CardHeader className="flex flex-row justify-between items-start gap-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {match.candidate_headline ??
                        match.candidate_github_username ??
                        "Candidate"}
                    </CardTitle>
                    {match.candidate_location && (
                      <Badge variant="outline" className="text-xs mt-2">
                        {match.candidate_location}
                      </Badge>
                    )}
                  </div>
                  {/* Was always `text-success`, so a 21% match was rendered in the
                      same affirmative green as a 94% one. Match strength is
                      carried by the number itself. */}
                  <div className="text-right">
                    <span className="block text-meta text-muted-foreground">
                      Match
                    </span>
                    <span
                      data-numeric
                      className="text-section font-medium tabular-nums text-foreground"
                    >
                      {match.match_percentage?.toFixed(0) ?? "—"}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{match.explanation}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-2">
                    <ScoreRow
                      label="Skill Overlap"
                      value={match.skill_similarity}
                    />
                    <ScoreRow
                      label="Semantic Similarity"
                      value={match.semantic_similarity}
                    />
                    <ScoreRow
                      label="Experience Match"
                      value={match.experience_match}
                    />
                    <ScoreRow
                      label="Talent Score Alignment"
                      value={match.talent_score_alignment}
                    />
                    <ScoreRow
                      label="Project Relevance"
                      value={match.project_relevance}
                    />
                    <ScoreRow
                      label="Overall Talent Score"
                      value={match.candidate_overall_talent_score}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Ranking Rubric
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                Scores combine skill overlap (verified GitHub/badge signals
                weighted over self-declared resume text), embedding semantic
                similarity, experience fit, and the candidate&apos;s own Talent
                Score.
              </p>
              <p>
                Never shown as a bare percentage alone — the full breakdown is
                always visible.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Page>
  );
}

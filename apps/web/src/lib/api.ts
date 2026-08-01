// Client-side helpers only — per doc 00 §2.1, Next.js never runs business logic or
// guards routes itself; components call FastAPI directly with the Clerk token they
// already have client-side. No Server Actions, no app/api/* proxying.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Role = "candidate" | "recruiter" | "organizer" | "judge" | "admin";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  organization_id: string | null;
  is_active: boolean;
}

export interface MeResponse {
  onboarding_required: boolean;
  profile: UserProfile | null;
}

export async function fetchMe(token: string): Promise<MeResponse> {
  // Previously fell back to a fake "Demo Candidate" profile on any failure, which
  // silently masked backend-down/slow-request symptoms as if the app were just showing
  // demo data. Callers must now handle the rejection and surface a real error state.
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /me failed: ${res.status}`);
  }
  return res.json();
}

export async function completeOnboarding(
  token: string,
  input: { role: Role; full_name?: string; username?: string },
): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/users/onboarding`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /users/onboarding failed: ${detail}`);
  }
  return res.json();
}

// --- Candidate Intelligence (Module 1 core loop) ---

export interface SubScore {
  value: number | null;
  evidence: string[];
  rationale: string | null;
}

export const SUB_SCORE_LABELS: Record<string, string> = {
  coding_ability: "Coding Ability",
  problem_solving: "Problem Solving",
  project_quality: "Project Quality",
  innovation: "Innovation",
  technical_consistency: "Technical Consistency",
  community_participation: "Community Participation",
  leadership: "Leadership",
};

export interface TalentScoreResponse {
  overall: number | null;
  sub_scores: Record<string, SubScore>;
  renormalized_subscores: string[];
  score_version: string;
  computed_at: string;
}

// --- Development Stats (GitHub) / Problem Solving Stats (LeetCode) — Codolio-style split.

export interface GithubStats {
  total_contributions: number;
  current_streak: number;
  longest_streak: number;
  active_days: number;
  bio: string | null;
  company: string | null;
  website_url: string | null;
  account_created_at?: string | null;
  followers: number;
  following: number;
  public_repos: number;
  owned_repo_count?: number;
  external_contributions?: number;
  pr_review_count?: number;
  commit_activity_weekly?: number[];
  days: { date: string; count: number }[];
}

export interface LeetcodeStats {
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  ranking: number | null;
  current_streak: number;
  total_active_days: number;
  submission_calendar: Record<string, number>;
  contest_history: { title: string; rating: number; ranking: number; start_time: number }[];
  latest_rating: number | null;
}

export interface CandidateProfileResponse {
  id: string;
  user_id: string;
  full_name: string | null;
  github_username: string | null;
  leetcode_username: string | null;
  headline: string | null;
  location: string | null;
  skills: { name: string; source?: string; confidence?: number }[] | null;
  experience: Record<string, unknown>[] | null;
  education: Record<string, unknown>[] | null;
  merged_conflicts: { description: string; resolved: boolean }[] | null;
  username: string | null;
  portfolio_published: boolean;
  github_stats: GithubStats | null;
  leetcode_stats: LeetcodeStats | null;
  stats_refreshed_at: string | null;
  ingestion_status: "idle" | "processing" | "done" | "failed";
  ingestion_error: string | null;
  updated_at: string;
}

export interface IngestionStatusResponse {
  status: "idle" | "processing" | "done" | "failed";
  error: string | null;
}

export async function fetchIngestionStatus(token: string): Promise<IngestionStatusResponse> {
  const res = await fetch(`${API_URL}/candidates/me/ingestion-status`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /candidates/me/ingestion-status failed: ${res.status}`);
  return res.json();
}

/** Polls fetchIngestionStatus until it leaves "processing" (or maxAttempts is hit), then
 * resolves with the final status. Ingestion (resume/certificate/GitHub sync parsing) now
 * runs as a backend background task instead of blocking the upload request, so callers
 * that want to know when it's actually done (e.g. to refresh the Talent Score display)
 * need to poll rather than trust the upload response alone. */
export async function pollIngestionStatus(
  token: string,
  { intervalMs = 2000, maxAttempts = 30 }: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<IngestionStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fetchIngestionStatus(token);
    if (result.status !== "processing") return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return fetchIngestionStatus(token);
}

export interface BadgeResponse {
  id: string;
  skill_name: string;
  corroboration_sources: string[];
  awarded_at: string;
}

export interface GithubProjectSummary {
  repo_full_name: string;
  stars: number | null;
  forks: number | null;
  languages: Record<string, number> | null;
  topics: string[] | null;
  pushed_at: string | null;
  description: string | null;
  commit_count?: number | null;
  pr_count?: number | null;
  issue_count?: number | null;
}

export interface GithubSummary {
  total_stars: number;
  total_commits: number;
  total_prs: number;
  total_issues: number;
  total_forks: number;
  owned_repo_count: number;
  external_contributions: number;
  pr_review_count: number;
  projects: GithubProjectSummary[];
}

export interface DashboardResponse {
  profile: CandidateProfileResponse;
  latest_score: TalentScoreResponse | null;
  score_history: TalentScoreResponse[];
  badges: BadgeResponse[];
  github_summary: GithubSummary;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchDashboard(token: string): Promise<DashboardResponse> {
  const res = await fetch(`${API_URL}/candidates/me/dashboard`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /candidates/me/dashboard failed: ${res.status}`);
  return res.json();
}

// Independent per-section fetches — used instead of fetchDashboard by CandidateDashboard
// so one section failing (e.g. Talent Score) doesn't blank the whole page; each section
// gets its own loading/error/retry state. See services/api/modules/candidates/router.py's
// `/me/github-summary` and `/me/badges` (split out from `/me/dashboard` for this reason).

export async function fetchMyProfile(token: string): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) throw new Error(`GET /candidates/me failed: ${res.status}`);
  return res.json();
}

export async function fetchGithubSummary(token: string): Promise<GithubSummary> {
  const res = await fetch(`${API_URL}/candidates/me/github-summary`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) throw new Error(`GET /candidates/me/github-summary failed: ${res.status}`);
  return res.json();
}

export async function fetchMyLatestScore(token: string): Promise<TalentScoreResponse | null> {
  const res = await fetch(`${API_URL}/candidates/me/score`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) throw new Error(`GET /candidates/me/score failed: ${res.status}`);
  return res.json();
}

export async function fetchMyScoreHistory(token: string): Promise<TalentScoreResponse[]> {
  const res = await fetch(`${API_URL}/candidates/me/score/history`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) throw new Error(`GET /candidates/me/score/history failed: ${res.status}`);
  return res.json();
}

export async function fetchMyBadges(token: string): Promise<BadgeResponse[]> {
  const res = await fetch(`${API_URL}/candidates/me/badges`, { headers: authHeaders(token), cache: "no-store" });
  if (!res.ok) throw new Error(`GET /candidates/me/badges failed: ${res.status}`);
  return res.json();
}

export async function grantConsent(token: string, consentType: string): Promise<void> {
  const res = await fetch(`${API_URL}/candidates/me/consents/${consentType}`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`POST /candidates/me/consents/${consentType} failed: ${res.status}`);
}

export async function fetchGithubOAuthUrl(token: string): Promise<string> {
  const res = await fetch(`${API_URL}/candidates/github/oauth-url`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`GET /candidates/github/oauth-url failed: ${res.status}`);
  const data = await res.json();
  return data.authorize_url;
}

export async function connectLeetcode(
  token: string,
  leetcodeUsername: string,
): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me/leetcode`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ leetcode_username: leetcodeUsername }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /candidates/me/leetcode failed: ${detail}`);
  }
  return res.json();
}

export async function refreshStats(token: string): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me/stats/refresh`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = payload?.detail?.retry_at ? `on cooldown until ${payload.detail.retry_at}` : `status ${res.status}`;
    throw new Error(`POST /candidates/me/stats/refresh failed: ${detail}`);
  }
  return res.json();
}

export async function uploadResume(
  token: string,
  file: File,
): Promise<CandidateProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/candidates/me/ingest/resume`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /candidates/me/ingest/resume failed: ${detail}`);
  }
  return res.json();
}

export async function uploadCertificate(
  token: string,
  file: File,
): Promise<CandidateProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/candidates/me/ingest/certificate`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /candidates/me/ingest/certificate failed: ${detail}`);
  }
  return res.json();
}

// --- FR-5: AI Resume & Portfolio Builder ---

export interface FactCheckFinding {
  claim: string;
  supported: boolean;
  note: string | null;
}

export interface GeneratedResumeContent {
  headline: string;
  summary: string;
  skills: string[];
  experience: { title: string; company?: string; years?: string; bullets: string[] }[];
  education: { institution?: string; degree?: string; year?: string }[];
}

export interface GeneratedCoverLetterContent {
  subject: string;
  body: string;
}

export interface GeneratedDocumentResponse {
  id: string;
  document_type: "resume" | "cover_letter";
  target_job_description: string | null;
  content: GeneratedResumeContent | GeneratedCoverLetterContent | Record<string, unknown>;
  file_url: string | null;
  fact_check_status: "pending" | "passed" | "failed";
  fact_check_findings: FactCheckFinding[] | null;
  model_used: string | null;
  generated_at: string;
}

/** Thrown for both 503 (generation/PDF/storage unavailable — e.g. missing API keys)
 * and 422 (fact-check failed) so the UI can distinguish "try again later" from
 * "this document had unsupported claims and was withheld". */
export class DocumentGenerationError extends Error {
  status: number;
  findings: FactCheckFinding[] | null;

  constructor(status: number, message: string, findings: FactCheckFinding[] | null = null) {
    super(message);
    this.status = status;
    this.findings = findings;
  }
}

async function postDocumentGeneration(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<GeneratedDocumentResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = payload?.detail;
    if (res.status === 422 && detail?.findings) {
      throw new DocumentGenerationError(422, "fact_check_failed", detail.findings);
    }
    throw new DocumentGenerationError(
      res.status,
      typeof detail === "string" ? detail : `${path} failed: ${res.status}`,
    );
  }
  return res.json();
}

export function generateResume(
  token: string,
  targetJobDescription?: string,
): Promise<GeneratedDocumentResponse> {
  return postDocumentGeneration(`/candidates/me/resume/generate`, token, {
    target_job_description: targetJobDescription || null,
  });
}

export function generateCoverLetter(
  token: string,
  targetJobDescription: string,
): Promise<GeneratedDocumentResponse> {
  return postDocumentGeneration(`/candidates/me/cover-letter/generate`, token, {
    target_job_description: targetJobDescription,
  });
}

export async function fetchMyDocuments(token: string): Promise<GeneratedDocumentResponse[]> {
  const res = await fetch(`${API_URL}/candidates/me/documents`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`GET /candidates/me/documents failed: ${detail}`);
  }
  return res.json();
}

export async function publishPortfolio(
  token: string,
  username?: string,
): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me/portfolio/publish`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    // Send username only if supplied (first-time set from /profile/edit).
    // Omit it when just toggling the switch — backend uses existing profile.username.
    body: JSON.stringify(username ? { username } : {}),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /candidates/me/portfolio/publish failed: ${detail}`);
  }
  return res.json();
}

export async function unpublishPortfolio(token: string): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me/portfolio/unpublish`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /candidates/me/portfolio/unpublish failed: ${detail}`);
  }
  return res.json();
}

// --- Public portfolio (FR-5.2) — server-side only, used by the SSR `/[username]` page.
// Takes an explicit base URL (the SSR page passes `BACKEND_URL`, a server-only env var —
// see doc 00 §2.1's SSR carve-out) rather than defaulting to NEXT_PUBLIC_API_URL, since
// this function has no business running in the browser.

export type PublicPortfolioProject = GithubProjectSummary;

export interface PublicPortfolioResponse {
  username: string;
  headline: string | null;
  location: string | null;
  skills: { name: string; source?: string; confidence?: number }[] | null;
  experience: Record<string, unknown>[] | null;
  education: Record<string, unknown>[] | null;
  projects: PublicPortfolioProject[];
  badges: BadgeResponse[];
  overall_score: number | null;
  github_username: string | null;
  leetcode_username: string | null;
  github_stats: GithubStats | null;
  github_summary: GithubSummary;
  leetcode_stats: LeetcodeStats | null;
  stats_refreshed_at: string | null;
  updated_at: string;
}

export async function fetchPublicPortfolio(
  baseUrl: string,
  username: string,
): Promise<PublicPortfolioResponse | null> {
  const res = await fetch(`${baseUrl}/public/candidates/${encodeURIComponent(username)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`GET /public/candidates/${username} failed: ${detail}`);
  }
  return res.json();
}

// --- Career Guidance (Module 1 FR-4) ---

export const CAREER_GUIDANCE_ROLES = [
  "Backend Engineer",
  "Frontend Engineer",
  "Full-Stack Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Mobile Engineer",
  "Cloud/Platform Engineer",
  "Site Reliability Engineer",
  "Security Engineer",
] as const;

export interface SkillGap {
  skill: string;
  similarity: number;
  weight: number;
  priority: number;
}

export interface CourseRecommendation {
  id: string;
  provider: "coursera" | "freecodecamp" | "vendor";
  title: string;
  url: string;
  skill_tags: string[];
  level: "beginner" | "intermediate" | "advanced" | null;
  estimated_hours: number | null;
  is_free: boolean;
}

export interface RoadmapStage {
  stage: string;
  skills: string[];
  estimated_weeks: number;
  description?: string;
}

export interface CareerGuidanceResponse {
  target_role: string | null;
  skill_gaps: SkillGap[];
  recommended_courses: CourseRecommendation[];
  roadmap: { stages: RoadmapStage[] };
  salary_estimate_low: number | null;
  salary_estimate_high: number | null;
  salary_rationale: string | null;
  generated_at: string;
}

export async function fetchCareerGuidance(
  token: string,
  options?: { targetRole?: string; refresh?: boolean },
): Promise<CareerGuidanceResponse> {
  const params = new URLSearchParams();
  if (options?.targetRole) params.set("target_role", options.targetRole);
  if (options?.refresh) params.set("refresh", "true");
  const query = params.toString();
  const res = await fetch(`${API_URL}/candidates/me/career-guidance${query ? `?${query}` : ""}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ? String(body.detail) : `GET career-guidance failed: ${res.status}`);
  }
  return res.json();
}

// --- Module 04: PPT Pitch Deck Analyzer ---

export const PITCH_SCORE_LABELS: Record<string, string> = {
  innovation: "Innovation & Impact",
  technical_feasibility: "Technical Feasibility",
  presentation_quality: "Presentation & Design Quality",
  business_potential: "Business & Market Potential",
};

export interface AIContentSignal {
  score: number | null;
  confidence_label: string;
  flagged_sections: string[];
  rationale: string;
}

export interface RubricScore {
  value: number | null;
  rationale: string | null;
  gaps: string[];
}

export interface PlagiarismMatchOut {
  id: string;
  presentation_id: string;
  matched_presentation_id: string;
  slide_index: number;
  similarity: number;
  flagged_at: string;
}

export interface SlideOut {
  slide_index: number;
  title: string | null;
  body: string | null;
  notes: string | null;
  has_image: boolean;
  ocr_text: string | null;
}

export interface PresentationUploadResponse {
  presentation_id: string;
  status: string;
}

export interface PresentationReportResponse {
  presentation_id: string;
  status: string;
  linked_repo: string | null;
  slides: SlideOut[];
  scores: Record<string, RubricScore>;
  overall_pitch_score: number | null;
  renormalized_scores: string[];
  summary: string | null;
  suggestions: string[];
  ai_content_signal: AIContentSignal | null;
  plagiarism_matches: PlagiarismMatchOut[];
  computed_at: string | null;
}

export async function uploadPresentation(
  token: string,
  file: File,
  linkedRepoUrl?: string,
): Promise<PresentationUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (linkedRepoUrl) formData.append("linked_repo_url", linkedRepoUrl);

  const res = await fetch(`${API_URL}/presentations/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`POST /presentations/upload failed: ${detail}`);
  }
  return res.json();
}

export async function fetchPresentationReport(
  token: string,
  presentationId: string,
): Promise<PresentationReportResponse> {
  const res = await fetch(`${API_URL}/presentations/${presentationId}/report`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`GET /presentations/${presentationId}/report failed: ${detail}`);
  }
  return res.json();
}

// --- Recruitment (Module 02) ---

export const APPLICATION_STAGES = [
  "sourced",
  "screened",
  "interview_scheduled",
  "offered",
  "rejected",
  "hired",
] as const;
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  sourced: "Sourced",
  screened: "Screened",
  interview_scheduled: "Interview Scheduled",
  offered: "Offered",
  rejected: "Rejected",
  hired: "Hired",
};

export interface JobResponse {
  id: string;
  organization_id: string | null;
  posted_by_user_id: string;
  title: string;
  description: string;
  required_skills: string[] | null;
  min_experience_years: number | null;
  location: string | null;
  is_remote: boolean;
  created_at: string;
  matching_status: "idle" | "processing" | "done" | "failed";
  matching_error: string | null;
}

export interface MatchingStatusResponse {
  status: "idle" | "processing" | "done" | "failed";
  error: string | null;
}

export async function fetchMatchingStatus(token: string, jobId: string): Promise<MatchingStatusResponse> {
  const res = await fetch(`${API_URL}/jobs/${jobId}/matching-status`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /jobs/${jobId}/matching-status failed: ${res.status}`);
  return res.json();
}

/** Same reasoning as pollIngestionStatus — job matching now runs as a backend background
 * task instead of blocking POST /jobs or the ?recompute=true request. */
export async function pollMatchingStatus(
  token: string,
  jobId: string,
  { intervalMs = 2000, maxAttempts = 30 }: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<MatchingStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fetchMatchingStatus(token, jobId);
    if (result.status !== "processing") return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return fetchMatchingStatus(token, jobId);
}

export interface JobCreateRequest {
  title: string;
  description: string;
  required_skills?: string[];
  min_experience_years?: number | null;
  location?: string | null;
  is_remote?: boolean;
}

export interface ApplicationResponse {
  id: string;
  job_id: string;
  candidate_id: string;
  stage: ApplicationStage;
  source: string | null;
  applied_at: string;
  stage_updated_at: string;
}

export interface ApplicationWithJobResponse extends ApplicationResponse {
  job_title: string;
  job_location: string | null;
}

export interface ApplicationWithCandidateResponse extends ApplicationResponse {
  candidate_headline: string | null;
  candidate_github_username: string | null;
  candidate_overall_talent_score: number | null;
  // Display-only — never affects card order/filtering. See QA finding "Recruiter #4".
  fraud_flag_status: "raised" | "under_review" | "upheld" | null;
  // Whichever of these is non-null, if any, is the candidate's most recent report.
  latest_submission_id: string | null;
  latest_interview_session_id: string | null;
  latest_contribution_repo_full_name: string | null;
}

export interface MatchScoreWithCandidateResponse {
  id: string;
  job_id: string;
  candidate_id: string;
  match_percentage: number | null;
  skill_similarity: number | null;
  semantic_similarity: number | null;
  experience_match: number | null;
  talent_score_alignment: number | null;
  project_relevance: number | null;
  explanation: string | null;
  computed_at: string;
  candidate_headline: string | null;
  candidate_location: string | null;
  candidate_github_username: string | null;
  candidate_overall_talent_score: number | null;
  // Display-only — never affects ranking/sort order. See QA finding "Recruiter #4".
  fraud_flag_status: "raised" | "under_review" | "upheld" | null;
}

export interface CopilotResult {
  candidate_id: string;
  match_percentage: number | null;
  explanation: string;
}

export interface CopilotQueryResponse {
  conversation_id: string;
  results: CopilotResult[];
  structured_filters_used: Record<string, unknown>;
}

export interface FunnelStage {
  stage: ApplicationStage;
  count: number;
  conversion_rate_from_previous: number | null;
}

export interface HiringFunnelResponse {
  job_id: string | null;
  stages: FunnelStage[];
}

export interface TimeToHireResponse {
  job_id: string | null;
  distribution: Record<string, number>;
  median_days: number | null;
}

export interface SourceBreakdownResponse {
  job_id: string | null;
  direct: number;
  copilot_search: number;
  hackathon: number;
}

async function recruitmentJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${detail}`);
  }
  return res.json();
}

export function createJob(token: string, body: JobCreateRequest): Promise<JobResponse> {
  return recruitmentJson(`/jobs`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchJobs(token: string): Promise<JobResponse[]> {
  return recruitmentJson(`/jobs`, token);
}

// --- Candidate job discovery (QA fix: candidates couldn't browse/apply — `GET /jobs`
// above is recruiter-only and 403s a candidate token; `GET /jobs/open` is the new,
// additive, candidate-role read added alongside it. See .agents/decisions.md.)

export function fetchOpenJobs(token: string): Promise<JobResponse[]> {
  return recruitmentJson(`/jobs/open`, token);
}

export function fetchJobMatches(token: string, jobId: string): Promise<MatchScoreWithCandidateResponse[]> {
  return recruitmentJson(`/jobs/${jobId}/matches`, token);
}

export function applyToJob(token: string, jobId: string): Promise<ApplicationResponse> {
  return recruitmentJson(`/jobs/${jobId}/apply`, token, { method: "POST" });
}

export function fetchMyApplications(token: string): Promise<ApplicationWithJobResponse[]> {
  return recruitmentJson(`/candidates/me/applications`, token);
}

export function fetchApplications(
  token: string,
  filters?: { jobId?: string; stage?: ApplicationStage },
): Promise<ApplicationWithCandidateResponse[]> {
  const params = new URLSearchParams();
  if (filters?.jobId) params.set("job_id", filters.jobId);
  if (filters?.stage) params.set("stage", filters.stage);
  const query = params.toString();
  return recruitmentJson(`/applications${query ? `?${query}` : ""}`, token);
}

export function updateApplicationStage(
  token: string,
  applicationId: string,
  stage: ApplicationStage,
): Promise<ApplicationResponse> {
  return recruitmentJson(`/applications/${applicationId}/stage`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
}

export function postCopilotQuery(
  token: string,
  message: string,
  conversationId?: string,
): Promise<CopilotQueryResponse> {
  return recruitmentJson(`/copilot/query`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
  });
}

export function fetchHiringFunnel(token: string, jobId?: string): Promise<HiringFunnelResponse> {
  const query = jobId ? `?job_id=${jobId}` : "";
  return recruitmentJson(`/analytics/hiring-funnel${query}`, token);
}

export function fetchTimeToHire(token: string, jobId?: string): Promise<TimeToHireResponse> {
  const query = jobId ? `?job_id=${jobId}` : "";
  return recruitmentJson(`/analytics/time-to-hire${query}`, token);
}

export function fetchSourceBreakdown(token: string, jobId?: string): Promise<SourceBreakdownResponse> {
  const query = jobId ? `?job_id=${jobId}` : "";
  return recruitmentJson(`/analytics/source-breakdown${query}`, token);
}

// --- Assessment & Verification (Module 03) ---

export interface HiddenTest {
  input: unknown;
  expected: unknown;
}

export interface CodingAssessmentSpec {
  problem_statement: string;
  starter_code?: string;
  hidden_tests: HiddenTest[];
}

export interface MCQQuestion {
  id: string;
  text: string;
  options?: string[];
  correct_answer: string;
}

export interface MCQAssessmentSpec {
  questions: MCQQuestion[];
}

export interface AssessmentResponse {
  id: string;
  job_id: string | null;
  candidate_id: string | null;
  type: "coding" | "mcq" | "project_analysis";
  spec: CodingAssessmentSpec | MCQAssessmentSpec | Record<string, unknown> | null;
  created_at: string;
}

export interface TestResult {
  test_name: string;
  passed: boolean;
}

export interface StaticAnalysisReport {
  syntax_valid?: boolean;
  radon?: Record<string, unknown>;
  lizard?: Record<string, unknown>;
  bandit?: Record<string, unknown>;
  skipped?: string;
}

export interface CodeReviewRubric {
  readability: number | null;
  architecture: number | null;
  red_flags: string[];
  rationale: string | null;
}

export interface SubmissionResponse {
  id: string;
  assessment_id: string;
  candidate_id: string;
  code_or_answers: Record<string, unknown> | null;
  test_results: { results: TestResult[]; rationale: string | null } | null;
  static_analysis: StaticAnalysisReport | null;
  llm_review: CodeReviewRubric | null;
  score: number | null;
  submitted_at: string;
}

async function assessmentJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${detail}`);
  }
  return res.json();
}

/** Recruiter-only (QA Recruiter #1 fix): creates an assessment, optionally assigning it
 * directly to a candidate via `candidateId` (Track 3's "Assign Assessment" pipeline
 * button calls this with a real candidate_id; omitting it authors a reusable template
 * for later assignment). See .agents/decisions.md for the exact request/response shape. */
export function createAssessment(
  token: string,
  body: { type: "coding" | "mcq" | "project_analysis"; spec: Record<string, unknown>; jobId?: string | null; candidateId?: string | null },
): Promise<AssessmentResponse> {
  return assessmentJson(`/assessments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: body.jobId ?? null,
      candidate_id: body.candidateId ?? null,
      type: body.type,
      spec: body.spec,
    }),
  });
}

export function fetchAssessment(token: string, assessmentId: string): Promise<AssessmentResponse> {
  return assessmentJson(`/assessments/${assessmentId}`, token);
}

/** Candidate-self-serve inbox (QA Candidate #4 fix): every assessment assigned to the
 * authenticated candidate, newest first. Powers `(candidate)/assessments/page.tsx`. */
export function fetchMyAssessments(token: string): Promise<AssessmentResponse[]> {
  return assessmentJson(`/assessments/mine`, token);
}

export function submitAssessment(
  token: string,
  assessmentId: string,
  body: { code_or_answers: Record<string, unknown>; test_results?: TestResult[] },
): Promise<SubmissionResponse> {
  return assessmentJson(`/assessments/${assessmentId}/submit`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code_or_answers: body.code_or_answers, test_results: body.test_results ?? [] }),
  });
}

export function fetchSubmission(token: string, submissionId: string): Promise<SubmissionResponse> {
  return assessmentJson(`/submissions/${submissionId}`, token);
}

// --- FR-2: AI Interview Agent ---

export interface InterviewTurnResponse {
  session_id: string;
  question: string | null;
  topics_remaining: number;
  status: "in_progress" | "completed";
}

export interface TranscriptTurn {
  turn_index: number;
  role: "agent" | "candidate";
  text: string;
  ts: string;
}

export interface InterviewReportResponse {
  id: string;
  session_id: string;
  response_confidence_signal: number | null;
  technical_rating: number | null;
  communication_rating: number | null;
  hiring_recommendation: string | null;
  generated_at: string;
  transcript: TranscriptTurn[];
}

export interface InterviewDefinitionQuestion {
  id: string;
  topic: string;
}

export interface InterviewDefinitionResponse {
  id: string;
  created_by_user_id: string;
  title: string;
  role_title: string;
  job_description: string;
  years_experience: number | null;
  questions: InterviewDefinitionQuestion[];
  question_count: number;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
}

export interface InterviewDefinitionAttempt {
  session_id: string;
  candidate_id: string;
  candidate_name: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  has_report: boolean;
}

export function generateDefinitionQuestions(
  token: string,
  body: { role_title: string; job_description: string; years_experience?: number; question_count?: number },
): Promise<{ questions: InterviewDefinitionQuestion[] }> {
  return assessmentJson(`/interview-definitions/generate-questions`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role_title: body.role_title,
      job_description: body.job_description,
      years_experience: body.years_experience ?? null,
      question_count: body.question_count ?? 5,
    }),
  });
}

export function createInterviewDefinition(
  token: string,
  body: {
    title: string;
    role_title: string;
    job_description: string;
    years_experience?: number;
    questions: InterviewDefinitionQuestion[];
    duration_minutes?: number;
  },
): Promise<InterviewDefinitionResponse> {
  return assessmentJson(`/interview-definitions`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchMyInterviewDefinitions(token: string): Promise<InterviewDefinitionResponse[]> {
  return assessmentJson(`/interview-definitions/mine`, token);
}

export function fetchOpenInterviewDefinitions(token: string): Promise<InterviewDefinitionResponse[]> {
  return assessmentJson(`/interview-definitions/open`, token);
}

export function updateInterviewDefinition(
  token: string,
  id: string,
  body: Partial<{
    title: string;
    questions: InterviewDefinitionQuestion[];
    duration_minutes: number;
    is_active: boolean;
  }>,
): Promise<InterviewDefinitionResponse> {
  return assessmentJson(`/interview-definitions/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchInterviewDefinitionAttempts(
  token: string,
  id: string,
): Promise<InterviewDefinitionAttempt[]> {
  return assessmentJson(`/interview-definitions/${id}/attempts`, token);
}

export function startInterview(
  token: string,
  body?: { job_id?: string; interview_definition_id?: string; topic_plan?: string[] },
): Promise<InterviewTurnResponse> {
  return assessmentJson(`/interview-sessions`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: body?.job_id ?? null,
      interview_definition_id: body?.interview_definition_id ?? null,
      topic_plan: body?.topic_plan ?? [],
    }),
  });
}

export interface InterviewSessionWithTranscript {
  session_id: string;
  status: "in_progress" | "completed";
  transcript: TranscriptTurn[];
}

export function getInterviewSession(token: string, sessionId: string): Promise<InterviewSessionWithTranscript> {
  return assessmentJson(`/interview-sessions/${sessionId}`, token);
}

export function interviewTurn(token: string, sessionId: string, answerText: string): Promise<InterviewTurnResponse> {
  return assessmentJson(`/interview-sessions/${sessionId}/turn`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer_text: answerText }),
  });
}

export function endInterview(token: string, sessionId: string): Promise<InterviewReportResponse> {
  return assessmentJson(`/interview-sessions/${sessionId}/end`, token, { method: "POST" });
}

export function fetchInterviewReport(token: string, sessionId: string): Promise<InterviewReportResponse> {
  return assessmentJson(`/interview-sessions/${sessionId}/report`, token);
}

// --- FR-3: Team Contribution Analytics ---

export interface ContributionReportResponse {
  id: string;
  repo_full_name: string;
  candidate_id: string | null;
  github_username: string | null;
  contribution_share: number | null;
  commits: number | null;
  lines_survived: number | null;
  prs_opened: number | null;
  prs_reviewed: number | null;
  anomaly_note: string | null;
  generated_at: string;
}

export function generateContributionReport(
  token: string,
  repoFullName: string,
  githubUsernames: string[],
): Promise<ContributionReportResponse[]> {
  return assessmentJson(`/contribution-reports/generate`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_full_name: repoFullName, github_usernames: githubUsernames }),
  });
}

export function fetchContributionReports(token: string, repoFullName: string): Promise<ContributionReportResponse[]> {
  return assessmentJson(`/contribution-reports?repo_full_name=${encodeURIComponent(repoFullName)}`, token);
}

// --- Hackathon Pipeline (Module 05) ---

async function hackathonJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface HackathonResponse {
  id: string;
  organizer_org_id: string | null;
  organizer_user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  tracks: string[] | null;
  ingestion_mode: "manual_csv" | "webhook" | "direct";
  status: "draft" | "active" | "judging" | "finalized";
  created_at: string;
}

export function createHackathon(
  token: string,
  body: { name: string; start_date?: string | null; end_date?: string | null; tracks?: string[]; ingestion_mode?: string },
): Promise<HackathonResponse> {
  return hackathonJson(`/hackathons`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tracks: [], ingestion_mode: "direct", ...body }),
  });
}

export function fetchMyHackathons(token: string): Promise<HackathonResponse[]> {
  return hackathonJson(`/hackathons`, token);
}

// --- Candidate hackathon discovery (QA fix: candidates couldn't browse/join — `GET
// /hackathons` above is organizer-only and 403s a candidate token; `GET /hackathons/open`
// is the new, additive, candidate-role read added alongside it. See .agents/decisions.md.)

export function fetchOpenHackathons(token: string): Promise<HackathonResponse[]> {
  return hackathonJson(`/hackathons/open`, token);
}

export function fetchHackathon(token: string, hackathonId: string): Promise<HackathonResponse> {
  return hackathonJson(`/hackathons/${hackathonId}`, token);
}

export interface TeamMemberInput {
  github_username?: string | null;
  display_name?: string | null;
  role?: string;
}

export interface TeamSubmissionInput {
  team_name: string;
  track?: string | null;
  members?: TeamMemberInput[];
  repo_url?: string | null;
  presentation_id?: string | null;
  judge_score?: number | null;
}

export interface CSVImportRowError {
  row_index: number;
  team_name: string | null;
  error: string;
}

export interface CSVImportResponse {
  teams_created: number;
  members_created: number;
  row_errors: CSVImportRowError[];
}

export function importHackathonTeamsCsv(
  token: string,
  hackathonId: string,
  teams: TeamSubmissionInput[],
): Promise<CSVImportResponse> {
  return hackathonJson(`/hackathons/${hackathonId}/import/csv`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teams }),
  });
}

export interface TeamResponse {
  id: string;
  hackathon_id: string;
  team_name: string;
  track: string | null;
}

export function submitHackathonProject(
  token: string,
  hackathonId: string,
  body: TeamSubmissionInput,
): Promise<TeamResponse> {
  return hackathonJson(`/hackathons/${hackathonId}/submissions`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function fetchHackathonTeams(token: string, hackathonId: string): Promise<TeamResponse[]> {
  return hackathonJson(`/hackathons/${hackathonId}/teams`, token);
}

export interface TeamMemberResponse {
  id: string;
  candidate_id: string | null;
  github_username: string | null;
  display_name: string | null;
  role: string;
}

export interface HackathonSubmissionResponse {
  id: string;
  team_id: string;
  repo_url: string | null;
  presentation_id: string | null;
  repo_analysis_submission_id: string | null;
  judge_score: number | null;
  judge_rationale: string | null;
  submitted_at: string;
}

export interface ScoreBreakdown {
  judge_score: number | null;
  pitch_score: number | null;
  repo_quality_score: number | null;
  novelty_score: number | null;
  renormalized: string[];
}

export interface RankingResponse {
  id: string;
  hackathon_id: string;
  team_id: string;
  team_name: string | null;
  rank: number;
  composite_score: number;
  score_breakdown: ScoreBreakdown | null;
  finalized_at: string;
}

export interface TeamDetailResponse {
  team: TeamResponse;
  members: TeamMemberResponse[];
  submission: HackathonSubmissionResponse | null;
  ranking: RankingResponse | null;
}

export function fetchHackathonTeamDetail(token: string, hackathonId: string, teamId: string): Promise<TeamDetailResponse> {
  return hackathonJson(`/hackathons/${hackathonId}/teams/${teamId}`, token);
}

export interface JudgeQueueEntry {
  submission_id: string;
  hackathon_id: string;
  hackathon_name: string;
  team_id: string;
  team_name: string;
  repo_url: string | null;
  presentation_id: string | null;
  judge_score: number | null;
  judge_rationale: string | null;
}

export function fetchJudgingQueue(token: string): Promise<JudgeQueueEntry[]> {
  return hackathonJson(`/judging/queue`, token);
}

export function submitJudgeScore(
  token: string,
  hackathonId: string,
  submissionId: string,
  body: { score: number; rationale?: string | null },
): Promise<HackathonSubmissionResponse> {
  return hackathonJson(`/hackathons/${hackathonId}/submissions/${submissionId}/judge-score`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface FinalizeRankingsResponse {
  hackathon_id: string;
  rankings: RankingResponse[];
}

export function finalizeHackathonRankings(
  token: string,
  hackathonId: string,
  body?: { custom_weights?: { judge_weight?: number; pitch_weight?: number; repo_weight?: number; novelty_weight?: number } },
): Promise<FinalizeRankingsResponse> {
  return hackathonJson(`/hackathons/${hackathonId}/rankings/finalize`, token, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function fetchHackathonRankings(token: string, hackathonId: string): Promise<RankingResponse[]> {
  return hackathonJson(`/hackathons/${hackathonId}/rankings`, token);
}

export function createRecruiterWatchlist(
  token: string,
  body: { track?: string | null; min_rank?: number | null; skills?: string[] },
): Promise<{ id: string; recruiter_id: string; criteria: Record<string, unknown> | null; created_at: string }> {
  return hackathonJson(`/recruiters/me/watchlists`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface TopPerformerEntry {
  hackathon_id: string;
  hackathon_name: string;
  team_id: string;
  team_name: string;
  rank: number;
  composite_score: number;
  candidate_id: string | null;
  candidate_headline: string | null;
  candidate_github_username: string | null;
  // Phase 2 integration (services/api/core/event_consumer.py) — live-computed against the
  // recruiter's own watchlists; false/[] when they have none yet.
  matched_watchlist: boolean;
  match_reasons: string[];
}

export function fetchTopPerformersFeed(token: string): Promise<{ entries: TopPerformerEntry[] }> {
  return hackathonJson(`/recruiters/me/top-performers-feed`, token);
}

// Public reads (doc 05 §8's leaderboard/team pages) — these three router endpoints have
// no `Depends(require_role(...))` at all, so no Clerk token is needed or sent.
async function publicHackathonJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`GET ${path} failed: ${detail}`);
  }
  return res.json();
}

export function fetchPublicHackathonRankings(hackathonId: string): Promise<RankingResponse[]> {
  return publicHackathonJson(`/hackathons/${hackathonId}/rankings`);
}

export function fetchPublicHackathonTeamDetail(hackathonId: string, teamId: string): Promise<TeamDetailResponse> {
  return publicHackathonJson(`/hackathons/${hackathonId}/teams/${teamId}`);
}

export function fetchPublicHackathon(hackathonId: string): Promise<HackathonResponse> {
  return publicHackathonJson(`/hackathons/${hackathonId}`);
}

// --- Trust & Fraud Prevention (Module 06) ---
//
// Doc 06 §6's endpoint list has no shared prefix (matches recruitment.py/hackathons.py's
// flat style). `raised` flags never auto-affect anything the frontend reads elsewhere
// (Talent Score, Copilot, rankings) — this is enforced entirely backend-side; the
// frontend just renders whatever the API returns.

async function fraudJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type FraudFlagStatus = "raised" | "under_review" | "upheld" | "dismissed";

export interface FraudFlagResponse {
  id: string;
  subject_type: string;
  subject_id: string;
  candidate_id: string | null;
  flag_type: string;
  status: FraudFlagStatus;
  evidence: Record<string, unknown>;
  raised_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export interface VerificationSignalResponse {
  signal_type: string;
  score: number | null;
  confidence_label: "low" | "medium" | "high";
  evidence: string | string[];
}

export interface VerificationCheckResponse {
  subject_type: string;
  subject_id: string;
  signals: VerificationSignalResponse[];
  flag: FraudFlagResponse | null;
}

export interface AuthenticityScoreResponse {
  candidate_id: string;
  score: number;
  components: {
    starting_score: number;
    penalties_applied: { flag_id: string; flag_type: string; penalty: number }[];
    total_penalty: number;
  } | null;
  computed_at: string;
}

export interface DisputeResponse {
  id: string;
  fraud_flag_id: string;
  candidate_id: string;
  candidate_statement: string | null;
  supporting_files: string[] | null;
  submitted_at: string;
}

export interface DisputeReviewAssist {
  available: boolean;
  candidate_context_summary: string | null;
  points_of_agreement_or_conflict: string[];
}

export interface FraudFlagDetailResponse {
  flag: FraudFlagResponse;
  dispute: DisputeResponse | null;
  dispute_review_assist: DisputeReviewAssist;
}

export interface FraudReviewQueueEntry {
  flag: FraudFlagResponse;
  candidate_headline: string | null;
  candidate_github_username: string | null;
  has_dispute: boolean;
}

// FR-6 — "corroboration strength," never a guilt score.
export function fetchAuthenticityScore(token: string, candidateId: string): Promise<AuthenticityScoreResponse> {
  return fraudJson(`/candidates/${candidateId}/authenticity-score`, token);
}

// FR-8 — candidate-visible view of flags raised against their own profile.
export function fetchCandidateFlags(token: string, candidateId: string): Promise<FraudFlagResponse[]> {
  return fraudJson(`/candidates/${candidateId}/flags`, token);
}

export function submitFlagDispute(
  token: string,
  flagId: string,
  body: { candidate_statement: string; supporting_files?: string[] },
): Promise<DisputeResponse> {
  return fraudJson(`/flags/${flagId}/dispute`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Admin/recruiter review queue + actions.
export function fetchFraudReviewQueue(token: string): Promise<FraudReviewQueueEntry[]> {
  return fraudJson(`/admin/fraud-review-queue`, token);
}

export function fetchFraudFlagDetail(token: string, flagId: string): Promise<FraudFlagDetailResponse> {
  return fraudJson(`/flags/${flagId}`, token);
}

export function reviewFraudFlag(
  token: string,
  flagId: string,
  body: { status: "upheld" | "dismissed"; review_notes?: string | null },
): Promise<FraudFlagResponse> {
  return fraudJson(`/flags/${flagId}/review`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Verification-check triggers (FR-1/FR-2/FR-3/FR-4/FR-5) — admin/recruiter-initiated,
// since this codebase has no async job queue (every module invokes its LangGraph
// synchronously from the router, per `.agents/decisions.md`).
export function checkCertificate(token: string, certificationId: string): Promise<VerificationCheckResponse> {
  return fraudJson(`/verification/certificates/${certificationId}/check`, token, { method: "POST" });
}

export function checkSubmission(token: string, submissionId: string): Promise<VerificationCheckResponse> {
  return fraudJson(`/verification/submissions/${submissionId}/check`, token, { method: "POST" });
}

export function checkProfileDuplicate(token: string, candidateId: string): Promise<VerificationCheckResponse> {
  return fraudJson(`/verification/profiles/${candidateId}/duplicate-check`, token, { method: "POST" });
}

// --- Recruiter pipeline enhancements (QA fix: Recruiter #1/#3/#4) ---
// assignAssessment mirrors Track 1's createAssessment contract exactly (POST /assessments
// accepting job_id/candidate_id/type/spec) -- kept minimal here since this file will be
// reconciled with Track 1's fuller api.ts additions at merge time; not meant to duplicate
// long-term, just lets the KanbanBoard "Assign Assessment" button compile and work now.
export function assignAssessment(
  token: string,
  body: { jobId: string; candidateId: string; type: "coding" | "mcq" | "project_analysis"; spec: Record<string, unknown> },
): Promise<{ id: string }> {
  return recruitmentJson(`/assessments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_id: body.jobId,
      candidate_id: body.candidateId,
      type: body.type,
      spec: body.spec,
    }),
  });
}

// --- Admin: user management + audit log ---

export interface AdminUserResponse {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  organization_id: string | null;
  is_active: boolean;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
}

async function adminJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${detail}`);
  }
  return res.json();
}

export function fetchAdminUsers(token: string): Promise<AdminUserResponse[]> {
  return adminJson(`/admin/users`, token);
}

export function updateUserRole(token: string, userId: string, role: Role): Promise<AdminUserResponse> {
  return adminJson(`/admin/users/${userId}/role`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function fetchAuditLog(token: string, limit = 100): Promise<AuditLogEntry[]> {
  return adminJson(`/admin/audit-log?limit=${limit}`, token);
}

// --- Admin: trusted issuer registry (Module 06 fraud engine) ---

export type TrustTier = "platform" | "university" | "employer" | "community";

export interface TrustedIssuerResponse {
  id: string;
  name: string;
  aliases: string[] | null;
  verification_url_template: string | null;
  trust_tier: TrustTier;
  notes: string | null;
  added_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustedIssuerCreateRequest {
  name: string;
  aliases?: string[] | null;
  verification_url_template?: string | null;
  trust_tier?: TrustTier;
  notes?: string | null;
}

export interface TrustedIssuerUpdateRequest {
  name?: string;
  aliases?: string[] | null;
  verification_url_template?: string | null;
  trust_tier?: TrustTier;
  notes?: string | null;
}

export function fetchTrustedIssuers(token: string): Promise<TrustedIssuerResponse[]> {
  return adminJson(`/admin/trusted-issuers`, token);
}

export function createTrustedIssuer(
  token: string,
  body: TrustedIssuerCreateRequest,
): Promise<TrustedIssuerResponse> {
  return adminJson(`/admin/trusted-issuers`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateTrustedIssuer(
  token: string,
  issuerId: string,
  body: TrustedIssuerUpdateRequest,
): Promise<TrustedIssuerResponse> {
  return adminJson(`/admin/trusted-issuers/${issuerId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteTrustedIssuer(token: string, issuerId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/trusted-issuers/${issuerId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`DELETE /admin/trusted-issuers/${issuerId} failed: ${detail}`);
  }
}

export interface ProfileUpdateRequest {
  full_name?: string | null;
  headline?: string | null;
  location?: string | null;
  college?: string | null;
  degree?: string | null;
}

export async function updateProfile(token: string, body: ProfileUpdateRequest): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me`, {
    method: "PATCH",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const detail = typeof payload?.detail === "string" ? payload.detail : `status ${res.status}`;
    throw new Error(`PATCH /candidates/me failed: ${detail}`);
  }
  return res.json();
}


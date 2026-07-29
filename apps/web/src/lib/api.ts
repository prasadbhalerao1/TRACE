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
  input: { role: Role; full_name?: string },
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
    throw new Error(`POST /users/onboarding failed: ${res.status}`);
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

export interface CandidateProfileResponse {
  id: string;
  user_id: string;
  github_username: string | null;
  headline: string | null;
  location: string | null;
  skills: { name: string; source?: string; confidence?: number }[] | null;
  experience: Record<string, unknown>[] | null;
  education: Record<string, unknown>[] | null;
  merged_conflicts: { description: string; resolved: boolean }[] | null;
  username: string | null;
  portfolio_published: boolean;
  updated_at: string;
}

export interface BadgeResponse {
  id: string;
  skill_name: string;
  corroboration_sources: string[];
  awarded_at: string;
}

export interface DashboardResponse {
  profile: CandidateProfileResponse;
  latest_score: TalentScoreResponse | null;
  score_history: TalentScoreResponse[];
  badges: BadgeResponse[];
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
  if (!res.ok) throw new Error(`POST /candidates/me/ingest/resume failed: ${res.status}`);
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
  if (!res.ok) throw new Error(`POST /candidates/me/ingest/certificate failed: ${res.status}`);
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
  if (!res.ok) throw new Error(`GET /candidates/me/documents failed: ${res.status}`);
  return res.json();
}

export async function publishPortfolio(
  token: string,
  username: string,
): Promise<CandidateProfileResponse> {
  const res = await fetch(`${API_URL}/candidates/me/portfolio/publish`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
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
  if (!res.ok) throw new Error(`POST /candidates/me/portfolio/unpublish failed: ${res.status}`);
  return res.json();
}

// --- Public portfolio (FR-5.2) — server-side only, used by the SSR `/[username]` page.
// Takes an explicit base URL (the SSR page passes `BACKEND_URL`, a server-only env var —
// see doc 00 §2.1's SSR carve-out) rather than defaulting to NEXT_PUBLIC_API_URL, since
// this function has no business running in the browser.

export interface PublicPortfolioProject {
  repo_full_name: string;
  stars: number | null;
  forks: number | null;
  languages: Record<string, unknown> | null;
}

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
  if (!res.ok) throw new Error(`GET /public/candidates/${username} failed: ${res.status}`);
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

export function fetchAssessment(token: string, assessmentId: string): Promise<AssessmentResponse> {
  return assessmentJson(`/assessments/${assessmentId}`, token);
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

export function startInterview(
  token: string,
  body?: { job_id?: string; topic_plan?: string[] },
): Promise<InterviewTurnResponse> {
  return assessmentJson(`/interview-sessions`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: body?.job_id ?? null, topic_plan: body?.topic_plan ?? [] }),
  });
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

export function finalizeHackathonRankings(token: string, hackathonId: string): Promise<FinalizeRankingsResponse> {
  return hackathonJson(`/hackathons/${hackathonId}/rankings/finalize`, token, { method: "POST" });
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
}

export function fetchTopPerformersFeed(token: string): Promise<{ entries: TopPerformerEntry[] }> {
  return hackathonJson(`/recruiters/me/top-performers-feed`, token);
}

// Public reads (doc 05 §8's leaderboard/team pages) — these three router endpoints have
// no `Depends(require_role(...))` at all, so no Clerk token is needed or sent.
async function publicHackathonJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
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

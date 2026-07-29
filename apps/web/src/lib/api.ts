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

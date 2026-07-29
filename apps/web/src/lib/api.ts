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

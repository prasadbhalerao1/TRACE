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

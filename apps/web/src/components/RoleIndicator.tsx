"use client";

import { useCurrentUser } from "@/components/CurrentUserProvider";

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  candidate: { bg: "bg-blue-100", text: "text-blue-700", label: "Candidate" },
  recruiter: { bg: "bg-purple-100", text: "text-purple-700", label: "Recruiter" },
  judge: { bg: "bg-amber-100", text: "text-amber-700", label: "Judge" },
  organizer: { bg: "bg-green-100", text: "text-green-700", label: "Organizer" },
  admin: { bg: "bg-red-100", text: "text-red-700", label: "Admin" },
};

export function RoleIndicator() {
  // Previously read `useAuth().user` — a field AuthContextValue does not define, so this
  // was a type error that always rendered nothing. The role lives on the /me payload.
  const { me } = useCurrentUser();

  // No mount guard needed: `me` starts as `undefined` and is only populated by a
  // client-side fetch, so the server and first client render both produce `null` here.
  // The previous `mounted` state existed to avoid a hydration mismatch that this
  // component could not actually have, and cost an extra render on every page.
  if (!me?.profile) return null;

  const role = me.profile.role || "candidate";
  const colors = ROLE_COLORS[role] || ROLE_COLORS.candidate;

  return (
    <div className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-medium`}>
      {colors.label}
    </div>
  );
}

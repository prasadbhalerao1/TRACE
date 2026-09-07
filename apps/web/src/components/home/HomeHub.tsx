"use client";

import { useCallback } from "react";
import { FeatureCard } from "@/components/home/FeatureCard";
import { ProfileCompleteness } from "@/components/home/ProfileCompleteness";
import {
  AdminAttention,
  CandidateAttention,
  JudgeAttention,
  OrganizerAttention,
  RecruiterAttention,
} from "@/components/home/RoleAttention";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import {
  Page,
  PageHeader,
  SectionHeader,
} from "@/components/common/PageHeader";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchMyProfile } from "@/lib/api";
import { ROLE_METADATA, type Role } from "@/lib/constants";
import { hubCapabilitiesFor } from "@/components/common/workspaceNav";

/** Titles that are never what someone is called, so the greeting skips past them.
 *
 * Matched without the trailing period so "Dr" and "Dr." both hit. */
const HONORIFICS = new Set([
  "mr", "mrs", "ms", "miss", "mx", "dr", "prof", "professor", "sir", "madam",
]);

/** The name to greet someone by, from their stored full name.
 *
 * `full_name.split(" ")[0]` produced "Welcome back, Dr." for a judge stored as
 * "Dr. Elena Rostova" — greeting someone by their honorific reads like a bug to the
 * person it happens to, and it is their own name on their own home page.
 *
 * Falls back to the whole string for mononyms, and to null for an empty or
 * punctuation-only name so the caller can use the generic greeting instead. */
function greetingName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts.find(
    (part) => !HONORIFICS.has(part.replace(/\.$/, "").toLowerCase()),
  );
  return first ?? parts[0] ?? null;
}

const ATTENTION: Record<Role, () => React.JSX.Element> = {
  candidate: CandidateAttention,
  recruiter: RecruiterAttention,
  organizer: OrganizerAttention,
  judge: JudgeAttention,
  admin: AdminAttention,
};

export function HomeHub() {
  const { me } = useCurrentUser();
  const { getToken } = useAuth();
  const role = (me?.profile?.role ?? "candidate") as Role;
  const isCandidate = role === "candidate";

  // Only candidates have a CandidateProfile, and only they get the completeness
  // nudge — fetching it for other roles would 403.
  const profileFetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchMyProfile(token);
  }, [getToken]);
  const profileResource = useAsyncResource(
    isCandidate ? profileFetcher : null,
    "home:profile",
  );

  const features = hubCapabilitiesFor(role);
  const roleMeta = ROLE_METADATA[role] ?? ROLE_METADATA.candidate;
  const firstName = greetingName(me?.profile?.full_name);
  const Attention = ATTENTION[role] ?? CandidateAttention;

  return (
    <Page>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome to TRACE"}
        description={roleMeta.greeting}
      />

      <div className="space-y-8">
        {/* What needs this person now, before what they could theoretically do. */}
        <section aria-label="Needs your attention">
          <Attention />
        </section>

        {isCandidate && profileResource.data ? (
          <ProfileCompleteness profile={profileResource.data} />
        ) : null}

        <section>
          <SectionHeader
            title="Everything you can do"
            description="Your full workspace, one card per capability."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={`${feature.href}-${feature.label}`}
                feature={feature}
              />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

"use client";

import Link from "next/link";
import { useCallback } from "react";
import {
  Activity, Award, BarChart3, Braces, Brain, Building2, ClipboardCheck, FileText,
  Flag, Gavel, Globe, LayoutDashboard, Lightbulb, ListChecks, Presentation,
  Search, ShieldAlert, Sparkles, Trophy, UserCog, Users, Workflow,
} from "lucide-react";

import { FeatureCard, type Feature } from "@/components/home/FeatureCard";
import { ProfileCompleteness } from "@/components/home/ProfileCompleteness";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchMyProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Role = "candidate" | "recruiter" | "organizer" | "judge" | "admin";

/** One catalog per role. Everything a role can reach lives here, so the hub is the
 * single answer to "what can I do?" — previously that was only discoverable by
 * finding the sidebar, which the landing page didn't render. */
const FEATURES: Record<Role, Feature[]> = {
  candidate: [
    { href: "/dashboard", title: "Talent Dashboard", description: "Your Talent Score, evidence receipts and GitHub analytics.", icon: LayoutDashboard },
    { href: "/profile/edit", title: "Ingest & Profile", description: "Connect GitHub, upload your résumé and certificates.", icon: Braces },
    { href: "/resume-builder", title: "Resume & Portfolio", description: "Generate an ATS-ready résumé and publish your portfolio.", icon: FileText },
    { href: "/career", title: "AI Career Guidance", description: "Skill gaps, a learning roadmap and salary ranges.", icon: Lightbulb },
    { href: "/interviews", title: "AI Interview", description: "Practice with an adaptive interviewer and get a scored report.", icon: Brain },
    { href: "/assessments", title: "Assessments", description: "Timed coding problems that verify your skills.", icon: ClipboardCheck },
    { href: "/jobs", title: "Browse Jobs", description: "Roles matched to your verified evidence.", icon: Search },
    { href: "/applications", title: "My Applications", description: "Track where every application stands.", icon: ListChecks },
    { href: "/hackathons", title: "Hackathons", description: "Join events and get in front of recruiters.", icon: Trophy },
    { href: "/pitch-deck", title: "Pitch Deck Analyzer", description: "Score a deck on clarity, innovation and feasibility.", icon: Presentation },
    { href: "/my-flags", title: "Disputes & Flags", description: "Review and dispute anything raised on your profile.", icon: Flag },
  ],
  recruiter: [
    { href: "/jobs/new", title: "Post a Job", description: "Create a role and trigger candidate matching.", icon: Building2 },
    { href: "/job-postings", title: "My Jobs", description: "Manage postings and review ranked matches.", icon: ListChecks },
    { href: "/copilot", title: "Recruiter Copilot", description: "Find candidates with plain-language search.", icon: Sparkles },
    { href: "/analytics", title: "Analytics", description: "Hiring funnel, time-to-hire and source breakdown.", icon: BarChart3 },
    { href: "/top-performers", title: "Top Performers", description: "Standouts surfaced from hackathon results.", icon: Award },
    { href: "/recruiter/interviews", title: "Interviews", description: "Publish interview templates and read reports.", icon: Brain },
  ],
  organizer: [
    { href: "/hackathons/new", title: "New Hackathon", description: "Create an event, set rubrics and scoring weights.", icon: Trophy },
    { href: "/hackathons", title: "Manage Events", description: "Import teams, assign judges, track submissions.", icon: Workflow },
    { href: "/hackathons", title: "Rankings", description: "Finalize leaderboards and publish results.", icon: Award },
  ],
  judge: [
    { href: "/evaluations", title: "Evaluation Queue", description: "Submissions assigned to you for scoring.", icon: Gavel },
  ],
  admin: [
    { href: "/fraud-review", title: "Fraud Review", description: "Adjudicate flags — nothing penalizes until you uphold it.", icon: ShieldAlert },
    { href: "/users", title: "User Roles", description: "Manage accounts, roles and organizations.", icon: UserCog },
    { href: "/trusted-issuers", title: "Trusted Issuers", description: "Curate the certificate issuer registry.", icon: Globe },
    { href: "/audit-log", title: "Audit Logs", description: "Every privileged action, with actor and target.", icon: Activity },
  ],
};

const ROLE_GREETING: Record<Role, string> = {
  candidate: "Build evidence recruiters can actually verify.",
  recruiter: "Find candidates by what they've built, not what they claim.",
  organizer: "Run events and turn results into hiring signal.",
  judge: "Score submissions against a consistent rubric.",
  admin: "Keep the platform trustworthy and its records clean.",
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
  const profileResource = useAsyncResource(isCandidate ? profileFetcher : null, "home:profile");

  const features = FEATURES[role] ?? FEATURES.candidate;
  const firstName = me?.profile?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink dark:text-zinc-50">
          {firstName ? `Welcome back, ${firstName}` : "Welcome to TRACE"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{ROLE_GREETING[role]}</p>
      </header>

      {isCandidate && profileResource.data && (
        <ProfileCompleteness profile={profileResource.data} />
      )}

      <section className="space-y-4">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-zinc-400">
          Everything you can do
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={`${feature.href}-${feature.title}`} feature={feature} />
          ))}
        </div>
      </section>

      {isCandidate && (
        <section className="rounded-xl border border-zinc-200 bg-linear-to-br from-indigo-50/60 to-white p-6 dark:border-zinc-800 dark:from-indigo-950/20 dark:to-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-sm font-semibold text-ink dark:text-zinc-50">
                Share your verified profile
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                A public portfolio page backed by real commit history and verified credentials.
              </p>
            </div>
            <Button variant="outline" render={<Link href="/resume-builder" />}>
              <Users className="mr-1.5 size-4" />
              Build portfolio
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

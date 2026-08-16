"use client";

import { useCallback } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Braces,
  Brain,
  Building2,
  ClipboardCheck,
  FileText,
  Flag,
  Gavel,
  Globe,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Presentation,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserCog,
  Workflow,
} from "lucide-react";

import { FeatureCard, type Feature } from "@/components/home/FeatureCard";
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

type Role = "candidate" | "recruiter" | "organizer" | "judge" | "admin";

/** Everything a role can reach. Secondary to the attention block above it: this answers
 * "what can I do?", which is the question people ask second. */
const FEATURES: Record<Role, Feature[]> = {
  candidate: [
    {
      href: "/dashboard",
      title: "Talent dashboard",
      description: "Your Talent Score, evidence receipts and GitHub analytics.",
      icon: LayoutDashboard,
    },
    {
      href: "/profile/edit",
      title: "Evidence & profile",
      description: "Connect GitHub, upload your résumé and certificates.",
      icon: Braces,
    },
    {
      href: "/resume-builder",
      title: "Résumé & portfolio",
      description: "Generate an ATS-ready résumé and publish your portfolio.",
      icon: FileText,
    },
    {
      href: "/career",
      title: "Career guidance",
      description: "Skill gaps, a learning roadmap and salary ranges.",
      icon: Lightbulb,
    },
    {
      href: "/interviews",
      title: "AI interview",
      description:
        "Practice with an adaptive interviewer and get a scored report.",
      icon: Brain,
    },
    {
      href: "/assessments",
      title: "Assessments",
      description: "Timed coding problems that verify your skills.",
      icon: ClipboardCheck,
    },
    {
      href: "/jobs",
      title: "Browse jobs",
      description: "Roles matched to your verified evidence.",
      icon: Search,
    },
    {
      href: "/applications",
      title: "My applications",
      description: "Track where every application stands.",
      icon: ListChecks,
    },
    {
      href: "/hackathons",
      title: "Hackathons",
      description: "Join events and get in front of recruiters.",
      icon: Trophy,
    },
    {
      href: "/pitch-deck",
      title: "Pitch deck analyzer",
      description: "Score a deck on clarity, innovation and feasibility.",
      icon: Presentation,
    },
    {
      href: "/my-flags",
      title: "Disputes & flags",
      description: "Review and dispute anything raised on your profile.",
      icon: Flag,
    },
  ],
  recruiter: [
    {
      href: "/job-postings",
      title: "My jobs",
      description: "Manage postings and review ranked matches.",
      icon: ListChecks,
    },
    {
      href: "/jobs/new",
      title: "Post a job",
      description: "Create a role and trigger candidate matching.",
      icon: Building2,
    },
    {
      href: "/copilot",
      title: "Copilot search",
      description: "Find candidates with plain-language search.",
      icon: Sparkles,
    },
    {
      href: "/analytics",
      title: "Analytics",
      description: "Hiring funnel, time-to-hire and source breakdown.",
      icon: BarChart3,
    },
    {
      href: "/top-performers",
      title: "Top performers",
      description: "Standouts surfaced from hackathon results.",
      icon: Award,
    },
    // Previously "/recruiter/interviews", which 404s — no such route has ever existed.
    {
      href: "/interview-templates",
      title: "Interview templates",
      description: "Publish interview templates and read scored reports.",
      icon: Brain,
    },
  ],
  organizer: [
    {
      href: "/events",
      title: "My events",
      description: "Import teams, assign judges, track submissions.",
      icon: Workflow,
    },
    {
      href: "/hackathons/new",
      title: "New hackathon",
      description: "Create an event, set rubrics and scoring weights.",
      icon: Trophy,
    },
  ],
  judge: [
    {
      href: "/evaluations",
      title: "Evaluation queue",
      description: "Submissions assigned to you for scoring.",
      icon: Gavel,
    },
  ],
  admin: [
    {
      href: "/fraud-review",
      title: "Fraud review",
      description: "Adjudicate flags — nothing penalizes until you uphold it.",
      icon: ShieldAlert,
    },
    {
      href: "/users",
      title: "Users & roles",
      description: "Manage accounts, roles and organizations.",
      icon: UserCog,
    },
    {
      href: "/trusted-issuers",
      title: "Trusted issuers",
      description: "Curate the certificate issuer registry.",
      icon: Globe,
    },
    {
      href: "/audit-log",
      title: "Audit log",
      description: "Every privileged action, with actor and target.",
      icon: Activity,
    },
  ],
};

const ROLE_GREETING: Record<Role, string> = {
  candidate: "Build evidence recruiters can actually verify.",
  recruiter: "Find candidates by what they've built, not what they claim.",
  organizer: "Run events and turn results into hiring signal.",
  judge: "Score submissions against a consistent rubric.",
  admin: "Keep the platform trustworthy and its records clean.",
};

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

  const features = FEATURES[role] ?? FEATURES.candidate;
  const firstName = me?.profile?.full_name?.split(" ")[0] ?? null;
  const Attention = ATTENTION[role] ?? CandidateAttention;

  return (
    <Page>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome to TRACE"}
        description={ROLE_GREETING[role]}
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
                key={`${feature.href}-${feature.title}`}
                feature={feature}
              />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

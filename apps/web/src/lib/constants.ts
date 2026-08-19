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
  type LucideIcon,
} from "lucide-react";

export type Role = "candidate" | "recruiter" | "organizer" | "judge" | "admin";

export interface RoleMetadata {
  value: Role;
  label: string;
  shortLabel: string;
  description: string;
  greeting: string;
  defaultPath: string;
  badgeVariant: "default" | "secondary" | "outline";
}

export const ROLES: readonly Role[] = [
  "candidate",
  "recruiter",
  "organizer",
  "judge",
  "admin",
] as const;

export const ROLE_METADATA: Record<Role, RoleMetadata> = {
  candidate: {
    value: "candidate",
    label: "Candidate",
    shortLabel: "Candidate",
    description: "Build evidence recruiters can actually verify.",
    greeting: "Build evidence recruiters can actually verify.",
    defaultPath: "/home",
    badgeVariant: "default",
  },
  recruiter: {
    value: "recruiter",
    label: "Recruiter",
    shortLabel: "Recruiter",
    description: "Find candidates by what they've built, not what they claim.",
    greeting: "Find candidates by what they've built, not what they claim.",
    defaultPath: "/home",
    badgeVariant: "secondary",
  },
  organizer: {
    value: "organizer",
    label: "Hackathon Organizer",
    shortLabel: "Organizer",
    description: "Run events and turn results into hiring signal.",
    greeting: "Run events and turn results into hiring signal.",
    defaultPath: "/home",
    badgeVariant: "outline",
  },
  judge: {
    value: "judge",
    label: "Judge",
    shortLabel: "Judge",
    description: "Score submissions against a consistent rubric.",
    greeting: "Score submissions against a consistent rubric.",
    defaultPath: "/home",
    badgeVariant: "outline",
  },
  admin: {
    value: "admin",
    label: "Admin",
    shortLabel: "Admin",
    description: "Keep the platform trustworthy and its records clean.",
    greeting: "Keep the platform trustworthy and its records clean.",
    defaultPath: "/home",
    badgeVariant: "secondary",
  },
};

/** Roles a visitor may assign themselves on the sign-up form.
 *
 * Deliberately a subset of `ROLES` rather than all of it. This list used to be
 * `ROLES.map(...)`, so the form offered "Admin" in its dropdown — and the API accepted
 * it, because `SignupRequest.role` was the full role enum. Picking it from the menu
 * granted user management, role reassignment for every account, the audit log and the
 * trusted-issuer registry.
 *
 * `admin`, `organizer` and `judge` are assigned by an existing admin via
 * `PATCH /admin/users/{id}/role`. MUST stay in sync with `SignupRole` in
 * packages/shared_schemas/users.py, which is the half that actually enforces;
 * services/api/tests/test_signup_roles.py asserts the two agree.
 */
export const SIGNUP_ROLES: readonly Role[] = ["candidate", "recruiter"] as const;

export const SIGNUP_ROLE_OPTIONS = SIGNUP_ROLES.map((r) => ({
  value: r,
  label: ROLE_METADATA[r].label,
}));

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export const RESERVED_USERNAMES = new Set([
  "api",
  "dashboard",
  "onboarding",
  "sign-in",
  "sign-up",
  "hackathons",
  "profile",
  "career",
  "resume-builder",
  "assessments",
  "interview",
  "my-flags",
  "applications",
  "jobs",
  "copilot",
  "pipeline",
  "analytics",
  "top-performers",
  "reports",
  "evaluations",
  "submissions",
  "fraud-review",
  "users",
  "audit-log",
  "candidates",
  "public",
  "me",
  "health",
  "home",
  "admin",
  "recruiter",
  "organizer",
  "judge",
  "settings",
]);

export interface FeatureItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const ROLE_FEATURES: Record<Role, FeatureItem[]> = {
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

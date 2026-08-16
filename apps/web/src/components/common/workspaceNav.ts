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
  Home,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Presentation,
  Search,
  ShieldAlert,
  Sparkles,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface WorkspaceNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match child routes too (e.g. /jobs/new highlights "Jobs"). Off by default so
   * sibling routes sharing a prefix don't both light up. */
  matchNested?: boolean;
}

export interface WorkspaceNavSection {
  /** Omitted for the first section, which needs no label above it. */
  label?: string;
  items: WorkspaceNavItem[];
}

export type WorkspaceRole =
  "candidate" | "recruiter" | "admin" | "organizer" | "judge";

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  candidate: "Candidate",
  recruiter: "Recruiter",
  admin: "Admin",
  organizer: "Organizer",
  judge: "Judge",
};

/** Sidebar contents per role.
 *
 * Centralized here rather than in each route-group layout because routes shared across
 * roles (/home) must render the *viewer's* nav, not the nav of whichever route group
 * owns the URL. Next resolves route groups to one path, so there is only one /home.
 *
 * Grouping matters beyond looks: the candidate list was 12 flat items, which is past
 * the point where a sidebar can be scanned.
 */
export const WORKSPACE_NAV: Record<WorkspaceRole, WorkspaceNavSection[]> = {
  candidate: [
    {
      items: [
        { href: "/home", label: "Home", icon: Home },
        {
          href: "/dashboard",
          label: "Talent dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Profile",
      items: [
        { href: "/profile/edit", label: "Evidence & profile", icon: Braces },
        {
          href: "/resume-builder",
          label: "Résumé & portfolio",
          icon: FileText,
        },
        { href: "/career", label: "Career guidance", icon: Lightbulb },
      ],
    },
    {
      label: "Opportunities",
      items: [
        { href: "/jobs", label: "Browse jobs", icon: Search },
        { href: "/applications", label: "My applications", icon: ListChecks },
        {
          href: "/hackathons",
          label: "Hackathons",
          icon: Trophy,
          matchNested: true,
        },
      ],
    },
    {
      label: "Practice",
      items: [
        { href: "/interviews", label: "AI interview", icon: Brain },
        {
          href: "/assessments",
          label: "Assessments",
          icon: ClipboardCheck,
          matchNested: true,
        },
        {
          href: "/pitch-deck",
          label: "Pitch deck analyzer",
          icon: Presentation,
        },
      ],
    },
    {
      label: "Account",
      items: [{ href: "/my-flags", label: "Disputes & flags", icon: Flag }],
    },
  ],

  recruiter: [
    {
      items: [
        { href: "/home", label: "Home", icon: Home },
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Hiring",
      items: [
        { href: "/job-postings", label: "My jobs", icon: ListChecks },
        { href: "/jobs/new", label: "Post a job", icon: Building2 },
        // Both previously unreachable from the sidebar despite being core recruiter
        // surfaces; they need a job id, so they link to the job list as the entry point.
        { href: "/job-postings", label: "Pipelines", icon: Users },
      ],
    },
    {
      label: "Evaluate",
      items: [
        // Was "/recruiter/interviews", which 404s — no such route exists. Route groups
        // contribute nothing to the URL, so this cannot be "/interviews" either:
        // (candidate)/interviews already owns that path.
        {
          href: "/interview-templates",
          label: "Interview templates",
          icon: Brain,
        },
        { href: "/copilot", label: "Copilot search", icon: Sparkles },
        { href: "/top-performers", label: "Top performers", icon: Award },
      ],
    },
  ],

  admin: [
    {
      items: [{ href: "/home", label: "Home", icon: Home }],
    },
    {
      label: "Trust & safety",
      items: [
        {
          href: "/fraud-review",
          label: "Fraud review",
          icon: ShieldAlert,
          matchNested: true,
        },
        { href: "/trusted-issuers", label: "Trusted issuers", icon: Globe },
      ],
    },
    {
      label: "Platform",
      items: [
        { href: "/users", label: "Users & roles", icon: UserCog },
        { href: "/audit-log", label: "Audit log", icon: Activity },
      ],
    },
  ],

  organizer: [
    {
      items: [
        { href: "/home", label: "Home", icon: Home },
        // Not "/hackathons": that path belongs to (candidate)/hackathons, and pointing
        // here sent organizers into a candidate-gated route that bounced them to /home.
        { href: "/events", label: "My events", icon: Trophy },
      ],
    },
    {
      label: "Create",
      items: [
        { href: "/hackathons/new", label: "New hackathon", icon: Sparkles },
      ],
    },
  ],

  judge: [
    {
      items: [
        { href: "/home", label: "Home", icon: Home },
        {
          href: "/evaluations",
          label: "Evaluation queue",
          icon: Gavel,
          matchNested: true,
        },
      ],
    },
  ],
};

/** True when `href` is the nav entry matching the current pathname. Exact by default;
 * prefix-matching only where `matchNested` is set, so /jobs and /jobs/new don't both
 * highlight. */
export function isNavItemActive(
  item: WorkspaceNavItem,
  pathname: string,
): boolean {
  if (pathname === item.href) return true;
  return Boolean(item.matchNested) && pathname.startsWith(`${item.href}/`);
}

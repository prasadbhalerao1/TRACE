export interface WorkspaceNavItem {
  href: string;
  label: string;
}

export type WorkspaceRole = "candidate" | "recruiter" | "admin" | "organizer" | "judge";

/** Sidebar contents per role, and the workspace heading above them.
 *
 * Centralized here rather than inlined in each route-group layout because routes shared
 * across roles (/home) need to render the *viewer's* nav, not the nav of whichever
 * route group happens to own the URL. Next resolves route groups to the same path, so
 * there can only be one /home — it looks its nav up from here by role.
 */
export const WORKSPACE_NAV: Record<WorkspaceRole, { heading: string; nav: WorkspaceNavItem[] }> = {
  candidate: {
    heading: "Candidate Workspace",
    nav: [
      { href: "/home", label: "Home" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/profile/edit", label: "Ingest & Profile" },
      { href: "/resume-builder", label: "Resume & Portfolio" },
      { href: "/career", label: "AI Career Guidance" },
      { href: "/pitch-deck", label: "Pitch Deck Analyzer" },
      { href: "/jobs", label: "Browse Jobs" },
      { href: "/hackathons", label: "Hackathons" },
      { href: "/assessments", label: "Assessments" },
      { href: "/interviews", label: "AI Interview" },
      { href: "/my-flags", label: "Disputes & Flags" },
      { href: "/applications", label: "My Applications" },
    ],
  },
  recruiter: {
    heading: "Recruiter Workspace",
    nav: [
      { href: "/home", label: "Home" },
      { href: "/jobs/new", label: "Post a Job" },
      { href: "/job-postings", label: "My Jobs" },
      { href: "/recruiter/interviews", label: "Interviews" },
      { href: "/copilot", label: "Recruiter Copilot" },
      { href: "/analytics", label: "Analytics" },
      { href: "/top-performers", label: "Top Performers" },
    ],
  },
  admin: {
    heading: "Admin Workspace",
    nav: [
      { href: "/home", label: "Home" },
      { href: "/fraud-review", label: "Fraud Review Queue" },
      { href: "/trusted-issuers", label: "Trusted Issuers" },
      { href: "/users", label: "User Roles" },
      { href: "/audit-log", label: "Audit Logs" },
    ],
  },
  organizer: {
    heading: "Organizer Workspace",
    nav: [
      { href: "/home", label: "Home" },
      { href: "/hackathons/new", label: "New Hackathon" },
      { href: "/hackathons", label: "My Hackathons" },
    ],
  },
  judge: {
    heading: "Judge Workspace",
    nav: [
      { href: "/home", label: "Home" },
      { href: "/evaluations", label: "Evaluations Queue" },
    ],
  },
};

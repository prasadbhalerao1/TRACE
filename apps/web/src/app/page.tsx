import Link from "next/link";
import {
  BarChart3,
  Braces,
  FileSearch,
  Gavel,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/** Public landing page.
 *
 * Rewritten from a grid of six "Role Workspaces & Feature Modules" cards that deep-linked
 * into role-gated routes — an internal sitemap, not a pitch. Two of those links pointed at
 * `/organizer/...` paths that could never resolve, because route groups contribute nothing
 * to the URL.
 *
 * A Server Component: nothing here is interactive, so none of it needs to ship JS. */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-workspace px-6 py-20 md:py-28">
        <div className="max-w-3xl space-y-6">
          <p className="text-meta font-medium text-primary">
            Evidence-based hiring
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
            Hire on what people have actually built.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            TRACE reads real commit history, verifies credentials against a trusted issuer
            registry, and scores candidates on evidence — showing its working for every
            number it produces, including how much evidence it had to go on.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Create an account
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/sign-in" />}>
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* The honest differentiator: the product refuses to overclaim, and says so. */}
      <section className="mx-auto w-full max-w-workspace px-6 pb-20">
        <div className="rounded-lg bg-muted/40 p-6 md:p-8">
          <h2 className="text-section font-semibold text-foreground">
            A score you can argue with
          </h2>
          <p className="mt-2 max-w-2xl text-body leading-relaxed text-muted-foreground">
            Every Talent Score carries the evidence behind it, the reasoning for each
            sub-score, and a confidence figure. A thin profile is reported as{" "}
            <span className="text-foreground">sparse evidence</span> — never as a weak
            candidate. Nothing is auto-rejected, and flags do nothing until a human upholds
            them.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-workspace px-6 pb-24">
        <h2 className="text-section font-semibold text-foreground">
          What the platform does
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          <Capability
            icon={Braces}
            title="Reads the real work"
            body="Connects GitHub and analyses commit history, languages and project quality — not a self-reported skills list."
          />
          <Capability
            icon={ShieldCheck}
            title="Verifies credentials"
            body="Certificates are checked against a curated issuer registry, and duplicate or AI-generated profiles are flagged for human review."
          />
          <Capability
            icon={Sparkles}
            title="Matches by evidence"
            body="Semantic search over real project vectors, so a role finds candidates by what they've shipped rather than by keyword overlap."
          />
          <Capability
            icon={FileSearch}
            title="Interviews and assessments"
            body="Adaptive AI interviews and timed coding problems, each returning a scored report with a full transcript."
          />
          <Capability
            icon={Gavel}
            title="Runs hackathons end to end"
            body="Import teams, collect submissions, score against a rubric, and publish a public leaderboard."
          />
          <Capability
            icon={BarChart3}
            title="Shows the funnel"
            body="Pipeline stages, time-to-hire and source breakdown, so hiring decisions have numbers behind them."
          />
        </div>
      </section>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex w-full max-w-workspace flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-body font-semibold text-foreground">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            TRACE
          </span>
          <p className="text-meta text-muted-foreground">
            Verified talent identity, AI-driven matching, and fraud-resistant hiring.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Capability({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-2">
      <Icon aria-hidden className="size-4 text-primary" />
      <h3 className="text-body font-medium text-foreground">{title}</h3>
      <p className="text-meta leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

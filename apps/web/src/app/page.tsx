import Link from "next/link";
import {
  ArrowRight,
  Brain,
  FileSearch,
  Gavel,
  LineChart,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  KineticHeadline,
  Reveal,
  SpotlightTile,
  Stagger,
  StaggerItem,
} from "@/components/landing/Motion";
import {
  EvidenceTrail,
  RecruiterSearch,
  VerificationChain,
} from "@/components/landing/ProductPreviews";
import { GridField, TiltCard } from "@/components/landing/Atmosphere";
import { AgentOrbit } from "@/components/landing/AgentOrbit";

/** Public landing page.
 *
 * A Server Component: the shell, all copy and all layout render without JS, and the
 * interactive pieces are isolated `"use client"` leaves. That is what lets the page
 * carry scroll choreography and still paint immediately.
 *
 * The product screenshots are the real components with the real seeded figures. A page
 * whose entire argument is "we show the evidence behind every number" cannot itself use
 * invented numbers, so there are no fabricated logos, testimonials or statistics here.
 */

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Hero />
      <Problem />
      <Intelligence />
      <ForRecruiters />
      <Verification />
      <Pipeline />
      <Agents />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <GridField />
      <div className="mx-auto grid w-full max-w-workspace gap-10 px-6 py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:py-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-meta font-medium text-primary shadow-flat">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary"
            />
            Evidence-based hiring
          </p>
          <KineticHeadline
            className="mt-4 text-display font-semibold text-foreground"
            lines={["Hire on what people", "have actually built."]}
          />
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            TRACE reads commit history, verifies credentials against a trusted
            issuer registry, and scores candidates on demonstrated work. Every
            number shows the evidence behind it, including how much evidence it
            had to go on.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Build your talent profile
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/sign-in" />}
            >
              Discover talent
            </Button>
          </div>
        </div>

        {/* The product is the hero image, and it responds to the pointer so it reads
            as a live surface rather than a screenshot. */}
        <Reveal delay={0.15}>
          <TiltCard>
            <EvidenceTrail />
          </TiltCard>
        </Reveal>
      </div>
    </section>
  );
}

/** The problem, argued by contrast rather than by assertion. */
function Problem() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-workspace px-6 py-16 lg:py-20">
        <Reveal className="max-w-2xl">
          <h2 className="text-headline font-semibold text-foreground">
            A resume is a claim. Work is a record.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Screening rewards whoever describes themselves best. The people who
            can actually do the work are often the worst at advertising it.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal className="rounded-lg bg-surface-sunken p-6">
            <p className="text-meta font-medium text-muted-foreground">
              What a resume asserts
            </p>
            <ul className="mt-4 space-y-2">
              {["React", "Python", "AI/ML", "Team leadership"].map((claim) => (
                <li
                  key={claim}
                  className="text-section text-muted-foreground line-through decoration-border"
                >
                  {claim}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-meta leading-relaxed text-muted-foreground">
              Unverifiable, self-reported, and identical across thousands of
              applications.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="rounded-lg bg-card p-6 shadow-flat">
            <p className="text-meta font-medium text-primary">
              What the work shows
            </p>
            <ul className="mt-4 divide-hairline">
              {[
                ["1,284 commits", "across 12 repositories"],
                ["3 hackathons", "one first place finish"],
                ["2 certificates", "checked against the issuer"],
                ["Timed assessment", "passed, with the transcript"],
              ].map(([fact, detail]) => (
                <li key={fact} className="py-2.5 first:pt-0">
                  <p className="text-body font-medium text-foreground">
                    {fact}
                  </p>
                  <p className="text-meta text-muted-foreground">{detail}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const CAPABILITIES = [
  {
    icon: Brain,
    title: "Talent intelligence",
    body: "Commit history, languages and project quality resolved into a score with a rationale for every component.",
    wide: true,
  },
  {
    icon: ShieldCheck,
    title: "Credential verification",
    body: "Certificates checked against a curated issuer registry.",
    wide: false,
  },
  {
    icon: FileSearch,
    title: "Assessments and AI interviews",
    body: "Timed problems and adaptive interviews, each returning a scored report and a full transcript.",
    wide: false,
  },
  {
    icon: Gavel,
    title: "Hackathons end to end",
    body: "Import teams, collect submissions, score against a rubric, publish a leaderboard.",
    wide: true,
  },
] as const;

function Intelligence() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-workspace px-6 py-16 lg:py-20">
        <Reveal className="max-w-2xl">
          <h2 className="text-headline font-semibold text-foreground">
            Scattered signals, resolved into a profile.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Six agents read the evidence a candidate has already produced. None
            of them asks the candidate to describe themselves.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body, wide }) => (
            <SpotlightTile
              key={title}
              className={wide ? "p-6 lg:col-span-2" : "p-6"}
            >
              <Icon aria-hidden className="size-4 text-primary" />
              <h3 className="mt-3 text-section font-medium text-foreground">
                {title}
              </h3>
              <p className="mt-1.5 max-w-prose text-body leading-relaxed text-muted-foreground">
                {body}
              </p>
            </SpotlightTile>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForRecruiters() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-workspace px-6 py-16 lg:py-20">
        <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
          <div>
            <p className="text-meta font-medium text-primary">For recruiters</p>
            <h2 className="mt-3 text-headline font-semibold text-foreground">
              Describe the role. Read why each candidate fits.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">
            Search in plain language across verified evidence. Every match
            arrives with the components behind the percentage, so a number is
            something you can argue with rather than accept.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8">
          <RecruiterSearch />
        </Reveal>
      </div>
    </section>
  );
}

function Verification() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid w-full max-w-workspace gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <Reveal>
          <h2 className="text-headline font-semibold text-foreground">
            Trust, with the reasoning attached.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Detection here is statistical, not forensic. The cost of a false
            positive is an accusation against a real person, so every check
            produces evidence for a human to weigh rather than a verdict.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A thin profile is reported as sparse evidence, never as a weak
            candidate. Those are different findings and the interface says so.
          </p>
        </Reveal>
        <VerificationChain />
      </div>
    </section>
  );
}

/** The differentiator: one continuous run from an event to a hire. Rendered as a single
 * spine rather than eight cards, because the connection is the point. */
const PIPELINE = [
  ["Hackathon", "A team ships a project under time pressure"],
  ["Evaluation", "Judges score against a rubric, the deck is analyzed"],
  ["Verification", "Authorship, commits and credentials are checked"],
  ["Talent profile", "Performance becomes evidence on a profile"],
  ["Discovery", "Recruiters find the standouts by what they built"],
  ["Interview", "An adaptive interview produces a scored report"],
  ["Hire", "A decision backed by a record, not a claim"],
] as const;

function Pipeline() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-workspace px-6 py-16 lg:py-20">
        <Reveal className="max-w-2xl">
          <h2 className="text-headline font-semibold text-foreground">
            A hackathon is a hiring pipeline.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Most events end with a leaderboard and a photo. Here the same work
            carries forward as verified evidence on every participant&rsquo;s profile.
          </p>
        </Reveal>

        <Stagger className="mt-10 border-l border-border pl-6" gap={0.05}>
          {PIPELINE.map(([step, detail]) => (
            <StaggerItem key={step} className="relative pb-7 last:pb-0">
              <span
                aria-hidden
                className="absolute top-1.5 -left-7.25 size-2 rounded-full bg-primary ring-4 ring-background"
              />
              <p className="text-section font-medium text-foreground">{step}</p>
              <p className="mt-1 text-body text-muted-foreground">{detail}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const AGENTS = [
  ["Talent intelligence", "Reads commits, projects and languages"],
  ["Verification", "Checks credentials and project authorship"],
  ["Interview", "Runs adaptive interviews and scores them"],
  ["Recruitment", "Matches roles to evidence and explains why"],
  ["Presentation", "Analyzes decks for clarity and feasibility"],
  ["Trust", "Raises fraud signals for human review"],
] as const;

function Agents() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <GridField />
      <div className="mx-auto grid w-full max-w-workspace gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
        <Reveal>
          <p className="text-meta font-medium text-primary">Under the hood</p>
          <h2 className="mt-3 text-headline font-semibold text-foreground">
            Six agents, one accountable profile.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A supervisor routes work to specialists and merges what they return.
            Every agent records the runs behind the figure it produces, so a
            score can be traced back to the thing that caused it.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            When a signal is missing, its weight is redistributed across the
            others and the score reports that it was, rather than filling the
            gap with a zero.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4">
            {AGENTS.map(([name, role]) => (
              <div key={name} className="border-t border-border pt-3">
                <dt className="text-body font-medium text-foreground">
                  {name}
                </dt>
                <dd className="mt-0.5 text-meta leading-relaxed text-muted-foreground">
                  {role}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* The architecture, drawn. A grid of agent cards would say nothing about
            how the pieces relate; this shows evidence converging on one profile. */}
        <Reveal delay={0.1}>
          <AgentOrbit />
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section>
      <div className="mx-auto w-full max-w-workspace px-6 py-24">
        <Reveal className="max-w-3xl">
          <h2 className="text-display font-semibold text-foreground">
            Stop reading resumes.
            <span className="block text-muted-foreground">
              Start reading evidence.
            </span>
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Build your talent profile
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/sign-in" />}
            >
              Discover talent
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-workspace flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="flex items-center gap-2 text-body font-semibold text-foreground">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            TRACE
          </span>
          <p className="mt-2 max-w-sm text-meta leading-relaxed text-muted-foreground">
            Talent Reliability and Assessment through Credential Evidence.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-8">
          <div className="space-y-2">
            <p className="text-meta font-medium text-foreground">Candidates</p>
            <FooterLink href="/sign-up" icon={Sparkles}>
              Build a profile
            </FooterLink>
            <FooterLink href="/sign-in" icon={LineChart}>
              Talent dashboard
            </FooterLink>
          </div>
          <div className="space-y-2">
            <p className="text-meta font-medium text-foreground">Recruiters</p>
            <FooterLink href="/sign-in" icon={UserRoundSearch}>
              Discover talent
            </FooterLink>
            <FooterLink href="/sign-up" icon={Gavel}>
              Run a hackathon
            </FooterLink>
          </div>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-sm text-meta text-muted-foreground outline-none transition-colors duration-(--animate-duration-fast) hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon aria-hidden className="size-3.5" />
      {children}
    </Link>
  );
}

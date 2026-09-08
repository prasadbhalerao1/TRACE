import Link from "next/link";
import { ArrowRight, Gavel, LineChart, Sparkles, UserRoundSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  KineticHeadline,
  LoadItem,
  LoadSequence,
  Reveal,
  Stagger,
  StaggerItem,
} from "@/components/landing/Motion";
import { VerificationChain } from "@/components/landing/ProductPreviews";
import { GridField, Counter, ScrollProgress } from "@/components/landing/Atmosphere";
import {
  Annotation,
  SceneMark,
  Section,
  SystemLabel,
} from "@/components/landing/Section";
import { EvidenceChain, TraceEvidence } from "@/components/landing/EvidenceLine";
import { ResumeDissolve } from "@/components/landing/ResumeDissolve";
import { SignalGraph } from "@/components/landing/SignalGraph";
import { InterviewPanel } from "@/components/landing/InterviewPanel";
import { WorkAnalysis } from "@/components/landing/WorkAnalysis";
import { Leaderboard } from "@/components/landing/Leaderboard";
import { CandidateJourney } from "@/components/landing/CandidateJourney";
import { TalentGraph } from "@/components/landing/TalentGraph";
import { AgentOrbit } from "@/components/landing/AgentOrbit";

/** Public landing page.
 *
 * A Server Component: the shell, all copy and all layout render without JS, and the
 * interactive pieces are isolated `"use client"` leaves. That is what lets the page carry
 * scroll choreography and still paint immediately.
 *
 * This page is **one continuous narrative**, not nine stacked sections. An earlier version
 * gave every scene the same left-text / right-card arrangement inside the same content
 * width, and nine different ideas read as one template repeated. The rules that replaced
 * that:
 *
 * - **No two consecutive scenes share a composition.** The page alternates big type,
 *   product, diagram, editorial statement and data visualisation.
 * - **Rhythm is HIGH then QUIET.** After a visually dense scene the next one is calm, so
 *   the dense ones keep their impact instead of becoming noise.
 * - **One dominant motion idea per scene**, always demonstrating something the product
 *   actually does. Motion that could not answer "what part of TRACE is this showing" was
 *   removed.
 * - **The evidence line is the through-line.** Wherever TRACE infers something, a cobalt
 *   line runs source to conclusion. That shared grammar is what makes nine scenes read as
 *   one system rather than as nine pages.
 * - **Light throughout.** No dark chapters, no theme switch. Contrast comes from the
 *   surface ladder, type scale and full-bleed interfaces.
 *
 * The figures are the seeded profile's real ones (overall 82.4, sub-scores
 * 88/85/87/84/89/78, matching `GET /candidates/me/score`). Demo product data is fine here;
 * invented customers, logos, testimonials and adoption statistics are not, and there are
 * none.
 */

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <ScrollProgress />
      <Hero />
      <ClaimVsRecord />
      <Intelligence />
      <Interview />
      <ReadingTheWork />
      <Trust />
      <Discovery />
      <HackathonToHire />
      <IntelligenceLayer />
      <Close />
      <Footer />
    </div>
  );
}

/* --- 01 Hero -----------------------------------------------------------------
   HIGH. Full viewport. The resume dismantling into evidence: the product thesis
   performed rather than described. */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <GridField />
      <div className="mx-auto flex w-full max-w-workspace flex-col justify-center gap-14 px-6 pt-14 pb-24 lg:min-h-[calc(100svh-4rem)] lg:flex-row lg:items-center lg:gap-20 lg:pt-16 lg:pb-24">
        <LoadSequence className="lg:w-[46%] lg:shrink-0">
          <LoadItem>
            <SceneMark index="01" label="Signals" />
          </LoadItem>
          <KineticHeadline
            className="mt-7 text-display font-semibold text-balance text-foreground"
            lines={[
              "See the talent",
              <>
                behind the <span className="text-muted-foreground">resume.</span>
              </>,
            ]}
          />
          <LoadItem>
            <p className="mt-7 max-w-lg text-lead text-muted-foreground">
              TRACE reads the work someone has already done, verifies it, and scores it.
              Every number shows the evidence behind it, including how much evidence it
              had to go on.
            </p>
          </LoadItem>
          <LoadItem className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Build your talent profile
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/sign-in" />}>
              Discover talent
            </Button>
          </LoadItem>
        </LoadSequence>

        {/* The product does the arguing, and it is not in a box: an interface framed as a
            screenshot beside a headline is what made the previous hero read as a
            documentation page. */}
        <div className="min-w-0 flex-1">
          <ResumeDissolve />
        </div>
      </div>
    </section>
  );
}

/* --- 02 Claim vs record ------------------------------------------------------
   QUIET. Pure editorial: the argument at display scale, then counted evidence. No
   product interface at all, which is what lets scene 03 land. */

const EVIDENCE = [
  { value: 1284, label: "commits read", detail: "across 12 repositories" },
  { value: 47, label: "signals", detail: "from 8 independent sources" },
  { value: 3, label: "hackathons", detail: "one first place finish" },
  { value: 4, label: "assessments", detail: "passed, with transcripts" },
] as const;

function ClaimVsRecord() {
  return (
    <Section id="platform" surface="sunken" pad="loose">
      <Reveal>
        <SceneMark index="02" label="Claim vs record" />
      </Reveal>

      {/* Typography as the material. Both halves at the same scale, so the contrast is
          carried by colour and by what follows each one. */}
      <Reveal className="mt-12 max-w-5xl">
        <h2 className="text-headline font-semibold text-balance">
          <span className="block text-muted-foreground/60">
            What people say they can do.
          </span>
          <span className="mt-2 block text-foreground">
            What they have actually built.
          </span>
        </h2>
      </Reveal>

      <Reveal className="mt-10 max-w-2xl">
        <p className="text-lead text-muted-foreground">
          Screening rewards whoever describes themselves best. The people who can do the
          work are often the worst at advertising it, and a resume gives you no way to
          tell the difference.
        </p>
      </Reveal>

      <dl className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {EVIDENCE.map((item, i) => (
          <Reveal
            key={item.label}
            delay={i * 0.06}
            className="border-t border-border pt-5"
          >
            <dt className="font-mono text-[clamp(2.75rem,1.2rem+3.4vw,4.25rem)] leading-[0.9] font-medium tracking-tight text-foreground">
              <Counter to={item.value} />
            </dt>
            <dd className="mt-4">
              <span className="block text-body font-medium text-foreground">
                {item.label}
              </span>
              <span className="block text-meta text-muted-foreground">
                {item.detail}
              </span>
            </dd>
          </Reveal>
        ))}
      </dl>
    </Section>
  );
}

/* --- 03 Intelligence ---------------------------------------------------------
   HIGH. Diagram scene, full width, with no text column competing beside it. */

function Intelligence() {
  return (
    <Section width="wide" pad="loose">
      <Reveal className="mx-auto max-w-workspace">
        <SceneMark index="03" label="Intelligence" />
        <h2 className="mt-7 max-w-3xl text-headline font-semibold text-balance text-foreground">
          Scattered signals, resolved into one accountable profile.
        </h2>
      </Reveal>

      <Reveal className="mt-10">
        <SignalGraph />
      </Reveal>

      {/* Follow the evidence, in its plainest form: each figure opens to its own chain. */}
      <Reveal className="mx-auto mt-10 max-w-workspace">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <SystemLabel>Score decomposition</SystemLabel>
          <Annotation label="Confidence" value="High" />
        </div>
        <div className="mt-6 grid gap-x-12 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          <TraceEvidence
            label="Project quality"
            value="87"
            steps={[
              { source: "Repositories", detail: "12 analyzed, 3 in production" },
              { source: "Architecture", detail: "reviewed against the deck claims" },
              { source: "Tests", detail: "coverage and review participation read" },
            ]}
          />
          <TraceEvidence
            label="Coding"
            value="88"
            steps={[
              { source: "GitHub", detail: "1,284 commits over 26 weeks" },
              { source: "Languages", detail: "6, with TypeScript and Python dominant" },
              { source: "Assessment", detail: "93rd percentile, transcript attached" },
            ]}
          />
          <TraceEvidence
            label="Consistency"
            value="89"
            steps={[
              {
                source: "Timeline",
                detail: "sustained since 2021, no unexplained gaps",
              },
              { source: "Cadence", detail: "bursts around each hackathon" },
            ]}
          />
        </div>
        <p className="mt-10 max-w-2xl text-body leading-relaxed text-muted-foreground">
          When a signal is missing its weight is redistributed across the others, and the
          score reports that it was, rather than filling the gap with a zero.
        </p>
      </Reveal>
    </Section>
  );
}

/* --- 04 Interview ------------------------------------------------------------
   HIGH. The interface takes the width; the copy is one line above it. */

function Interview() {
  return (
    <Section id="candidates" surface="sunken" width="wide" pad="loose">
      <Reveal className="mx-auto max-w-workspace">
        <SceneMark index="04" label="Evaluation" />
        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-2xl text-headline font-semibold text-balance text-foreground">
            An interview that measures reasoning.
          </h2>
          <p className="max-w-md text-lead text-muted-foreground">
            The answer becomes a chain of thought, and every signal quotes the words that
            earned it.
          </p>
        </div>
      </Reveal>

      <Reveal className="mt-14">
        <InterviewPanel />
      </Reveal>
    </Section>
  );
}

/* --- 05 Reading the work -----------------------------------------------------
   Product, but driven by the visitor rather than autoplaying, against a plain
   statement and one forward evidence chain. */

function ReadingTheWork() {
  return (
    <Section width="wide" pad="loose">
      <Reveal className="mx-auto max-w-workspace">
        <SceneMark index="05" label="The work" />
        <h2 className="mt-7 max-w-3xl text-headline font-semibold text-balance text-foreground">
          It reads the work, not the description of the work.
        </h2>
        <EvidenceChain
          className="mt-8"
          steps={["Deck claim", "Repository", "Architecture", "Feasibility 88"]}
        />
      </Reveal>

      <Reveal className="mt-14">
        <WorkAnalysis />
      </Reveal>
    </Section>
  );
}

/* --- 06 Trust ----------------------------------------------------------------
   QUIET. The ethical position stated plainly, with the checks and the review queue
   beside it. */

function Trust() {
  return (
    <Section surface="sunken" pad="loose">
      <Reveal>
        <SceneMark index="06" label="Trust" />
      </Reveal>
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
        <Reveal>
          <h2 className="text-headline font-semibold text-balance text-foreground">
            Evidence for review, never a verdict.
          </h2>
          <p className="mt-7 max-w-xl text-lead text-muted-foreground">
            Detection here is statistical, not forensic. The cost of a false positive is
            an accusation against a real person, so every check produces evidence for a
            human to weigh.
          </p>
          <p className="mt-5 max-w-xl text-body leading-relaxed text-muted-foreground">
            A thin profile is reported as sparse evidence, never as a weak candidate.
            Those are different findings and the interface says so: the confidence a score
            carries is shown beside the score itself.
          </p>

          {/* The review queue is the honest version of a trust badge. It says what is
              unresolved rather than declaring everything clean. */}
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-t border-border pt-6">
            {[
              ["Checks resolved", "4"],
              ["Awaiting review", "1"],
              ["Evidence strength", "High"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
                  {k}
                </dt>
                <dd
                  data-numeric
                  className="mt-1 font-mono text-section font-medium text-foreground"
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={0.08}>
          <VerificationChain />
        </Reveal>
      </div>
    </Section>
  );
}

/* --- 07 Discovery ------------------------------------------------------------
   HIGH. The graph owns the width, and a query reshapes it. */

function Discovery() {
  return (
    <Section id="recruiters" width="wide" pad="loose">
      <Reveal className="mx-auto max-w-workspace">
        <SceneMark index="07" label="Discovery" />
        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-2xl text-headline font-semibold text-balance text-foreground">
            Search the talent graph.
          </h2>
          <p className="max-w-md text-lead text-muted-foreground">
            Describe a role in plain language. The graph responds, and every match arrives
            with the route through the evidence that produced it.
          </p>
        </div>
      </Reveal>

      <Reveal className="mt-14">
        <TalentGraph />
      </Reveal>
    </Section>
  );
}

/* --- 08 Hackathon to hire ----------------------------------------------------
   HIGH. One card transforming through the pipeline, with the leaderboard as its
   opening beat. */

function HackathonToHire() {
  return (
    <Section surface="sunken" width="wide" pad="loose">
      <Reveal className="mx-auto max-w-workspace">
        <SceneMark index="08" label="Hiring" />
        <h2 className="mt-7 max-w-3xl text-headline font-semibold text-balance text-foreground">
          A hackathon is a hiring pipeline.
        </h2>
        <p className="mt-7 max-w-2xl text-lead text-muted-foreground">
          Most events end with a leaderboard and a photograph. Here the same work carries
          forward as verified evidence, and one participant becomes a hire without ever
          rewriting a resume.
        </p>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-workspace gap-14">
        <Reveal>
          <Leaderboard />
        </Reveal>
        <Reveal delay={0.06}>
          <CandidateJourney />
        </Reveal>
      </div>
    </Section>
  );
}

/* --- 09 Intelligence layer ---------------------------------------------------
   QUIET before the close. The architecture, stated plainly. */

const AGENTS = [
  ["Talent intelligence", "Reads commits, projects and languages"],
  ["Verification", "Checks credentials and project authorship"],
  ["Interview", "Runs adaptive interviews and scores them"],
  ["Recruitment", "Matches roles to evidence and explains why"],
  ["Presentation", "Analyzes decks for clarity and feasibility"],
  ["Trust", "Raises fraud signals for human review"],
] as const;

function IntelligenceLayer() {
  return (
    <Section id="intelligence" pad="loose">
      <Reveal>
        <SceneMark index="09" label="The intelligence layer" />
      </Reveal>
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16">
        <Reveal>
          <h2 className="text-headline font-semibold text-balance text-foreground">
            Six agents, one accountable profile.
          </h2>
          <p className="mt-7 max-w-xl text-lead text-muted-foreground">
            A supervisor routes work to specialists and merges what they return. Every
            agent records the runs behind the figure it produces, so a score can be traced
            back to the thing that caused it.
          </p>

          <dl className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {AGENTS.map(([name, role]) => (
              <div key={name} className="border-t border-border pt-3.5">
                <dt className="text-body font-medium text-foreground">{name}</dt>
                <dd className="mt-1 text-meta leading-relaxed text-muted-foreground">
                  {role}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={0.1}>
          <AgentOrbit />
        </Reveal>
      </div>
    </Section>
  );
}

/* --- Close -------------------------------------------------------------------
   The conclusion the page has earned, at the largest type on it. */

const OUTCOMES = [
  ["Candidates", "Be found for what you built, not how you wrote it up."],
  ["Recruiters", "Shortlist from evidence, with the reasoning attached."],
  ["Organisers", "Turn an event into a lasting talent pipeline."],
  ["Investors", "Read a team's technical record, not just its deck."],
] as const;

function Close() {
  return (
    <Section pad="loose" className="border-t border-border">
      <Stagger className="mx-auto max-w-4xl text-center" gap={0.09}>
        <StaggerItem>
          <SystemLabel>The evidence layer for talent</SystemLabel>
        </StaggerItem>
        <StaggerItem>
          <h2 className="mt-7 text-display font-semibold text-balance text-foreground">
            Stop reading resumes.
            <span className="block text-muted-foreground">Start reading evidence.</span>
          </h2>
        </StaggerItem>
        <StaggerItem className="mt-10 flex flex-wrap justify-center gap-3">
          <Button size="lg" render={<Link href="/sign-up" />}>
            Build your talent profile
            <ArrowRight aria-hidden className="size-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/sign-in" />}>
            Discover talent
          </Button>
        </StaggerItem>
      </Stagger>

      <dl className="mx-auto mt-20 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map(([who, what]) => (
          <Reveal key={who} className="border-t border-border pt-4">
            <dt className="text-meta font-medium text-primary">{who}</dt>
            <dd className="mt-2 text-body leading-relaxed text-muted-foreground">
              {what}
            </dd>
          </Reveal>
        ))}
      </dl>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-workspace flex-col gap-6 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="flex items-center gap-2 text-body font-semibold text-foreground">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            TRACE
          </span>
          <p className="mt-2 max-w-sm text-meta leading-relaxed text-muted-foreground">
            Talent Reliability and Assessment through Credential Evidence.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-10">
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

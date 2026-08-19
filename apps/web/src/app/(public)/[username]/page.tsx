// FR-5.2 — public candidate portfolio. Per doc/multi-agent-architecture/00 §2.1, this is
// one of only TWO pages in the whole app that use Server-Side Rendering (the other is
// the hackathon leaderboard) — everywhere else in this app is a Client Component that
// fetches from FastAPI in the browser. This page is the exception because it must be
// public, unauthenticated, and crawlable/SEO-friendly (NFR: Lighthouse SEO >= 90),
// which means the HTML has to already contain the content on first response.
//
// No "use client" here — this is a Server Component. It fetches directly from FastAPI
// at request time (no caching: `cache: "no-store"` inside fetchPublicPortfolio) using
// the server-only BACKEND_URL env var, never NEXT_PUBLIC_API_URL — this fetch must
// never ship to or run in the browser bundle. Per doc 00 §2.1's hard boundary, Next.js
// still never touches the database directly; it only talks to FastAPI over HTTP.
//
// Sub-sections below (RepositoryGrid, SkillsSection, AchievementsGrid, charts) are
// Client Components for their Framer Motion/recharts interactivity — Next's App Router
// allows a Server Component page to render Client Component children directly.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AchievementsGridWrapper } from "@/components/achievements/AchievementsGridWrapper";
import { CommitActivityChartLazy } from "@/components/charts/CommitActivityChartLazy";
import { ContributionHeatmap } from "@/components/charts/ContributionHeatmap";
import { LanguageChart } from "@/components/charts/LanguageChart";
import { EmptyState } from "@/components/common/EmptyState";
import { Section } from "@/components/common/Section";
import { ProblemSolvingStats } from "@/components/ProblemSolvingStats";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { RepositoryGridWrapper } from "@/components/repositories/RepositoryGridWrapper";
import { SkillsSectionWrapper } from "@/components/skills/SkillsSectionWrapper";
import { GithubStatsCardsWrapper } from "@/components/stats/GithubStatsCardsWrapper";
import { StatsGrid } from "@/components/stats/StatsGrid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPublicPortfolio } from "@/lib/api";

import { BACKEND_URL } from "@/lib/env";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const portfolio = await fetchPublicPortfolio(BACKEND_URL, username);
  if (!portfolio) {
    return { title: "Profile not found" };
  }
  const title = portfolio.headline
    ? `${portfolio.username} — ${portfolio.headline}`
    : portfolio.username;
  return {
    title,
    description:
      portfolio.headline ??
      `${portfolio.username}'s verified talent profile, projects, and badges.`,
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  const portfolio = await fetchPublicPortfolio(BACKEND_URL, username);

  if (!portfolio) {
    notFound();
  }

  const {
    headline,
    location,
    skills,
    experience,
    education,
    badges,
    overall_score,
    github_username,
    leetcode_username,
    github_stats,
    github_summary,
    leetcode_stats,
  } = portfolio;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 bg-card text-foreground p-8">
      <ProfileHeader
        username={portfolio.username}
        headline={headline}
        location={location}
        overallScore={overall_score}
      />

      {!github_username || !github_stats ? (
        <Card className="bg-card text-card-foreground">
          <CardContent className="p-5">
            <EmptyState
              title="No GitHub evidence yet"
              description="This candidate hasn't connected a GitHub account, so there are no repositories to show."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <StatsGrid stats={github_stats} />

          <Section title="Contribution Activity">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                Contributions{" "}
                <span className="font-semibold text-foreground">
                  {github_stats.total_contributions}
                </span>
              </span>
              <span className="text-muted-foreground">
                Max Streak{" "}
                <span className="font-semibold text-foreground">
                  {github_stats.longest_streak}
                </span>
              </span>
              <span className="text-muted-foreground">
                Current Streak{" "}
                <span className="font-semibold text-foreground">
                  {github_stats.current_streak}
                </span>
              </span>
            </div>
            <ContributionHeatmap days={github_stats.days} />
          </Section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="Languages">
              <LanguageChart projects={github_summary.projects} />
            </Section>
            <Section title="Commit Activity (weekly)">
              <CommitActivityChartLazy
                weeklyCounts={github_stats.commit_activity_weekly}
              />
            </Section>
          </div>

          <GithubStatsCardsWrapper summary={github_summary} />

          <RepositoryGridWrapper projects={github_summary.projects} />

          <SkillsSectionWrapper projects={github_summary.projects} />

          <AchievementsGridWrapper
            githubStats={github_stats}
            githubSummary={github_summary}
            projects={github_summary.projects}
          />
        </>
      )}

      <ProblemSolvingStats
        leetcodeUsername={leetcode_username}
        leetcodeStats={leetcode_stats}
      />

      {skills && skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Skills (from resume)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <Badge key={i} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Verified badges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge
                key={badge.id}
                variant="secondary"
                className="border-teal-verified/40 text-success"
                title={badge.corroboration_sources.join(", ")}
              >
                {badge.skill_name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {experience && experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {experience.map((entry, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">
                  {String(entry.title ?? "")}
                  {entry.company ? ` — ${String(entry.company)}` : ""}
                </p>
                {entry.description ? (
                  <p className="text-muted-foreground">
                    {String(entry.description)}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {education && education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {education.map((entry, i) => (
              <p key={i} className="text-sm">
                {String(entry.institution ?? "")}{" "}
                {entry.degree ? `— ${String(entry.degree)}` : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

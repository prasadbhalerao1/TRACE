"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AchievementsGrid } from "@/components/achievements/AchievementsGrid";
import { BadgeGrid } from "@/components/BadgeGrid";
import { Section } from "@/components/common/Section";
import { SectionError } from "@/components/common/SectionError";
import { CardSkeleton } from "@/components/common/Skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { EvidenceReceipt } from "@/components/EvidenceReceipt";
import { ProblemSolvingStats } from "@/components/ProblemSolvingStats";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { RepositoryGrid } from "@/components/repositories/RepositoryGrid";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { GithubStatsCards } from "@/components/stats/GithubStatsCards";
import { StatsGrid } from "@/components/stats/StatsGrid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import {
  fetchGithubOAuthUrl,
  fetchGithubSummary,
  fetchMyBadges,
  fetchMyLatestScore,
  fetchMyProfile,
  fetchMyScoreHistory,
  publishPortfolio,
  refreshStats,
  unpublishPortfolio,
  type CandidateProfileResponse,
} from "@/lib/api";

// Dynamically imported: recharts + framer-motion are heavy dependencies only needed
// once GitHub/Talent Score data has actually loaded — keeping them out of this page's
// initial JS bundle shortens time-to-interactive for everything above the fold
// (profile sidebar, connect-GitHub CTA) that doesn't depend on them. ssr: false since
// these only ever render after client-side data resolves, so there's nothing to
// server-render for them anyway.
const ContributionHeatmap = dynamic(
  () =>
    import("@/components/charts/ContributionHeatmap").then(
      (m) => m.ContributionHeatmap,
    ),
  {
    ssr: false,
    loading: () => <div className="h-32 animate-pulse rounded-md bg-muted" />,
  },
);
const LanguageChart = dynamic(
  () =>
    import("@/components/charts/LanguageChart").then((m) => m.LanguageChart),
  {
    ssr: false,
    loading: () => <div className="h-56 animate-pulse rounded-md bg-muted" />,
  },
);
const CommitActivityChart = dynamic(
  () =>
    import("@/components/charts/CommitActivityChart").then(
      (m) => m.CommitActivityChart,
    ),
  {
    ssr: false,
    loading: () => <div className="h-56 animate-pulse rounded-md bg-muted" />,
  },
);
const ScoreRadarChart = dynamic(
  () => import("@/components/ScoreRadarChart").then((m) => m.ScoreRadarChart),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse rounded-md bg-muted" />,
  },
);
const ScoreTrendLine = dynamic(
  () => import("@/components/ScoreTrendLine").then((m) => m.ScoreTrendLine),
  {
    ssr: false,
    loading: () => <div className="h-56 animate-pulse rounded-md bg-muted" />,
  },
);

// Mirrors the backend's `_STATS_REFRESH_COOLDOWN` (services/api/modules/candidates/router.py)
// so the countdown is accurate without waiting on a 429 to learn the retry time.
const STATS_REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

export function CandidateDashboard() {
  const { getToken } = useAuth();
  const [refreshBusy, setRefreshBusy] = useState(false);

  // Two independent fetches, deliberately not one.
  //
  // This was a single `/me/dashboard` call fanned out into three synthetic resource
  // objects that all shared one `loading` flag — so the entire page waited on the
  // slowest part of the payload (the GitHub summary, which scans every snapshot) before
  // *anything* could render. That is the "connect GitHub, then stare at nothing"
  // symptom.
  //
  // Splitting on the cheap/expensive boundary lets the profile, score and badges paint
  // from indexed lookups while the GitHub aggregate is still in flight. Both fetchers
  // are memoized on the now-stable `getToken`, so they are issued in parallel on mount
  // rather than serialized.
  const coreFetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    // Parallel, not sequential: these are four independent indexed queries and awaiting
    // them one at a time would stack four round trips into the critical path.
    const [profile, latestScore, scoreHistory, badges] = await Promise.all([
      fetchMyProfile(token),
      fetchMyLatestScore(token),
      fetchMyScoreHistory(token),
      fetchMyBadges(token),
    ]);
    return { profile, latestScore, scoreHistory, badges };
  }, [getToken]);

  const githubFetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchGithubSummary(token);
  }, [getToken]);

  // cacheKey enables stale-while-revalidate: navigating away from the dashboard and back
  // shows the last-loaded data instantly instead of re-paying the backend round-trip
  // (which includes the DB's cold-connection latency on the first query of a session).
  const coreResource = useAsyncResource(coreFetcher, "dashboard:core");
  const githubResource = useAsyncResource(githubFetcher, "dashboard:github");

  const profileResource = {
    data: coreResource.data?.profile ?? null,
    loading: coreResource.loading,
    error: coreResource.error,
    retry: coreResource.retry,
  };
  const talentResource = {
    data: coreResource.data
      ? {
          latestScore: coreResource.data.latestScore,
          scoreHistory: coreResource.data.scoreHistory,
          badges: coreResource.data.badges,
        }
      : null,
    loading: coreResource.loading,
    error: coreResource.error,
    retry: coreResource.retry,
  };

  // Optimistically-updatable local copy — publish/unpublish/refresh mutate this directly
  // via their own response payload rather than re-fetching the whole bundle.
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [prevProfileData, setPrevProfileData] =
    useState<CandidateProfileResponse | null>(null);

  if (profileResource.data !== prevProfileData) {
    setPrevProfileData(profileResource.data);
    setProfile(profileResource.data);
  }

  async function handleTogglePublic(published: boolean) {
    if (!profile) return;
    const token = await getToken();
    if (!token) return;
    try {
      const updated = published
        ? await publishPortfolio(token)
        : await unpublishPortfolio(token);
      setProfile(updated);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${published ? "publish" : "unpublish"} portfolio`,
      );
    }
  }

  const [busyConnect, setBusyConnect] = useState(false);

  async function handleConnectGithub() {
    setBusyConnect(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const authorizeUrl = await fetchGithubOAuthUrl(token);
      window.location.href = authorizeUrl;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not start GitHub connection",
      );
      setBusyConnect(false);
    }
  }

  async function handleRefresh() {
    const token = await getToken();
    if (!token) return;
    setRefreshBusy(true);
    try {
      const updated = await refreshStats(token);
      setProfile(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to refresh stats",
      );
    } finally {
      setRefreshBusy(false);
    }
  }

  const refreshCooldownUntil = profile?.stats_refreshed_at
    ? new Date(
        new Date(profile.stats_refreshed_at).getTime() +
          STATS_REFRESH_COOLDOWN_MS,
      )
    : null;

  const githubStats = profile?.github_stats ?? null;
  const githubUsername = profile?.github_username ?? null;
  // Development Stats genuinely needs both resources — the charts read `github_stats`
  // off the profile and the totals off the GitHub summary — so this section alone waits
  // on the pair. Every other section below reads only the resource it actually needs.
  const devStatsLoading = profileResource.loading || githubResource.loading;
  const devStatsError = profileResource.error ?? githubResource.error;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:items-start max-w-7xl mx-auto w-full px-4 py-8">
      {profileResource.loading && !profile ? (
        // Sized to the real ProfileSidebar so the two-column grid is laid out from the
        // first paint and nothing jumps sideways when the profile lands.
        <CardSkeleton className="h-105 w-full" />
      ) : profileResource.error && !profile ? (
        <SectionError
          message={profileResource.error}
          onRetry={profileResource.retry}
          retrying={profileResource.loading}
        />
      ) : profile ? (
        <ProfileSidebar
          profile={profile}
          onTogglePublic={handleTogglePublic}
          onRefresh={handleRefresh}
          refreshBusy={refreshBusy}
          refreshCooldownUntil={refreshCooldownUntil}
        />
      ) : null}

      <div className="space-y-6 flex-1 min-w-0">
        {devStatsLoading && !githubResource.data ? (
          // Matches the real Development Stats block (stat cards + two charts) so this
          // section reserves its final height instead of collapsing and pushing
          // everything below it down when the data arrives.
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <CardSkeleton className="h-24" />
              <CardSkeleton className="h-24" />
              <CardSkeleton className="h-24" />
              <CardSkeleton className="h-24" />
            </div>
            <CardSkeleton className="h-32" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CardSkeleton className="h-56" />
              <CardSkeleton className="h-56" />
            </div>
          </div>
        ) : devStatsError && !githubResource.data ? (
          <SectionError
            message={devStatsError}
            onRetry={() => {
              profileResource.retry();
              githubResource.retry();
            }}
            retrying={devStatsLoading}
          />
        ) : !githubUsername || !githubStats || !githubResource.data ? (
          <Card className="border-border bg-card text-foreground shadow-flat ">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-sm text-muted-foreground font-medium">
                Connect GitHub to unlock Development Stats, achievements, and
                repository analytics.
              </p>
              <Button
                onClick={handleConnectGithub}
                disabled={busyConnect}
                className="bg-foreground hover:bg-foreground text-white font-medium px-6 py-2"
              >
                {busyConnect ? "Connecting..." : "Connect GitHub"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <StatsGrid stats={githubStats} />

            {/* Row 1: Contribution Activity (Full-width) */}
            <Section title="Contribution Activity">
              <div className="mb-4 flex flex-wrap items-center gap-6 text-meta font-medium text-muted-foreground select-none">
                <span>
                  Contributions:{" "}
                  <span className="font-extrabold text-foreground">
                    {githubStats.total_contributions}
                  </span>
                </span>
                <span>
                  Max Streak:{" "}
                  <span className="font-extrabold text-foreground">
                    {githubStats.longest_streak}d
                  </span>
                </span>
                <span>
                  Current Streak:{" "}
                  <span className="font-extrabold text-foreground">
                    {githubStats.current_streak}d
                  </span>
                </span>
              </div>
              <ContributionHeatmap days={githubStats.days} />
            </Section>

            {/* Row 2: Languages and Commit Activity (Side by Side) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Section title="Languages">
                <LanguageChart projects={githubResource.data.projects} />
              </Section>
              <Section title="Commit Activity (weekly)">
                <CommitActivityChart
                  weeklyCounts={githubStats.commit_activity_weekly}
                />
              </Section>
            </div>

            {/* Row 3: Talent Score and Score History (Side by Side) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {talentResource.loading && !talentResource.data ? (
                <Card>
                  <CardContent className="space-y-3 p-6">
                    {/* A skeleton, not an empty state: the score is loading, not absent. */}
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ) : talentResource.error && !talentResource.data ? (
                <SectionError
                  message={talentResource.error}
                  onRetry={talentResource.retry}
                  retrying={talentResource.loading}
                />
              ) : !talentResource.data?.latestScore ? (
                <Card className="border-border bg-card text-foreground shadow-flat ">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-section font-semibold text-foreground">
                      Connect evidence to get Talent Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="mb-4 text-xs text-muted-foreground">
                      Connect GitHub and upload a resume to compute your first
                      Talent Score.
                    </p>
                    <Button
                      className="w-full bg-foreground hover:bg-foreground text-white font-medium"
                      render={<Link href="/profile/edit" />}
                    >
                      Get started
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="border-border bg-card text-foreground shadow-flat ">
                    <CardHeader className="pb-3 border-b border-border mb-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-section font-semibold text-foreground">
                        Talent Score
                      </CardTitle>
                      <span className="font-heading text-xl font-extrabold text-primary font-mono">
                        {talentResource.data.latestScore.overall !== null
                          ? talentResource.data.latestScore.overall.toFixed(1)
                          : "—"}
                      </span>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScoreRadarChart
                        subScores={talentResource.data.latestScore.sub_scores}
                      />
                    </CardContent>
                  </Card>

                  <Section title="Score history">
                    <ScoreTrendLine
                      history={talentResource.data.scoreHistory}
                    />
                  </Section>
                </>
              )}
            </div>

            {/* Row 4: Evidence Receipt & (Badges + Skills Matrix) (Side by Side) */}
            {talentResource.data?.latestScore && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <EvidenceReceipt score={talentResource.data.latestScore} />
                <div className="space-y-6">
                  <Section title="Badges">
                    <BadgeGrid badges={talentResource.data.badges} />
                  </Section>
                  <Section title="Skills Matrix">
                    <SkillsSection projects={githubResource.data.projects} />
                  </Section>
                </div>
              </div>
            )}

            {/* Row 5: GitHub Stats (Full Width) */}
            <Section title="GitHub Stats">
              <GithubStatsCards summary={githubResource.data} />
            </Section>

            {/* Row 6: Repository Analytics (Full Width) */}
            <Section title="Repository Analytics">
              <RepositoryGrid projects={githubResource.data.projects} />
            </Section>

            {/* Row 7: Problem Solving Stats (Full Width) */}
            {profile && (
              <ProblemSolvingStats
                leetcodeUsername={profile.leetcode_username}
                leetcodeStats={profile.leetcode_stats}
              />
            )}

            {/* Row 8: Achievements Portfolio (Full Width) */}
            <Section title="Achievements Portfolio">
              <AchievementsGrid
                githubStats={githubStats}
                githubSummary={githubResource.data}
                projects={githubResource.data.projects}
              />
            </Section>
          </>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 pt-6 border-t border-border">
          <Button
            variant="outline"
            className="border-border hover:bg-card hover:text-foreground text-foreground font-medium transition-colors"
            render={<Link href="/profile/edit" />}
          >
            {githubUsername ? "Update evidence" : "Connect evidence"}
          </Button>
          <Button
            variant="outline"
            className="border-border hover:bg-card hover:text-foreground text-foreground font-medium transition-colors"
            render={<Link href="/resume-builder" />}
          >
            Build resume & portfolio
          </Button>
          <Button
            variant="outline"
            className="border-border hover:bg-card hover:text-foreground text-foreground font-medium transition-colors"
            render={<Link href="/career" />}
          >
            AI Career Guidance
          </Button>
          <Button
            variant="outline"
            className="border-border hover:bg-card hover:text-foreground text-foreground font-medium transition-colors"
            render={<Link href="/pitch-deck" />}
          >
            Pitch Deck Analyzer
          </Button>
        </div>
      </div>
    </div>
  );
}

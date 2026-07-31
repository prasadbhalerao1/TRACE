"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AchievementsGrid } from "@/components/achievements/AchievementsGrid";
import { BadgeGrid } from "@/components/BadgeGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Section } from "@/components/common/Section";
import { SectionError } from "@/components/common/SectionError";
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
  fetchDashboard,
  fetchGithubOAuthUrl,
  grantConsent,
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
  () => import("@/components/charts/ContributionHeatmap").then((m) => m.ContributionHeatmap),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-md bg-zinc-100" /> },
);
const LanguageChart = dynamic(
  () => import("@/components/charts/LanguageChart").then((m) => m.LanguageChart),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-md bg-zinc-100" /> },
);
const CommitActivityChart = dynamic(
  () => import("@/components/charts/CommitActivityChart").then((m) => m.CommitActivityChart),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-md bg-zinc-100" /> },
);
const ScoreRadarChart = dynamic(
  () => import("@/components/ScoreRadarChart").then((m) => m.ScoreRadarChart),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-md bg-zinc-100" /> },
);
const ScoreTrendLine = dynamic(
  () => import("@/components/ScoreTrendLine").then((m) => m.ScoreTrendLine),
  { ssr: false, loading: () => <div className="h-56 animate-pulse rounded-md bg-zinc-100" /> },
);

// Mirrors the backend's `_STATS_REFRESH_COOLDOWN` (services/api/modules/candidates/router.py)
// so the countdown is accurate without waiting on a 429 to learn the retry time.
const STATS_REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

export function CandidateDashboard() {
  const { getToken } = useAuth();
  const [refreshBusy, setRefreshBusy] = useState(false);

  // Single batched fetch (one Clerk-token round trip + one backend round trip instead of
  // three) — /me/dashboard already computes profile, github_summary, and talent/badges
  // together server-side, so there's no per-section partial-failure case to guard here:
  // either the whole bundle loads or none of it does. Sections still render/error/retry
  // independently at the UI level (below) so the layout doesn't change, but they all
  // share this one request instead of issuing their own.
  const dashboardFetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchDashboard(token);
  }, [getToken]);
  // cacheKey enables stale-while-revalidate: navigating away from the dashboard and back
  // shows the last-loaded data instantly instead of re-paying the backend round-trip
  // (which includes the DB's cold-connection latency on the first query of a session).
  const dashboardResource = useAsyncResource(dashboardFetcher, "dashboard:bundle");

  const profileResource = {
    data: dashboardResource.data?.profile ?? null,
    loading: dashboardResource.loading,
    error: dashboardResource.error,
    retry: dashboardResource.retry,
  };
  const githubResource = {
    data: dashboardResource.data?.github_summary ?? null,
    loading: dashboardResource.loading,
    error: dashboardResource.error,
    retry: dashboardResource.retry,
  };
  const talentResource = {
    data: dashboardResource.data
      ? {
          latestScore: dashboardResource.data.latest_score,
          scoreHistory: dashboardResource.data.score_history,
          badges: dashboardResource.data.badges,
        }
      : null,
    loading: dashboardResource.loading,
    error: dashboardResource.error,
    retry: dashboardResource.retry,
  };

  // Optimistically-updatable local copy — publish/unpublish/refresh mutate this directly
  // via their own response payload rather than re-fetching the whole bundle.
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null);
  const [prevProfileData, setPrevProfileData] = useState<CandidateProfileResponse | null>(null);

  if (profileResource.data !== prevProfileData) {
    setPrevProfileData(profileResource.data);
    setProfile(profileResource.data);
  }

  async function handleTogglePublic(published: boolean) {
    if (!profile) return;
    const token = await getToken();
    if (!token) return;
    try {
      const updated = published ? await publishPortfolio(token) : await unpublishPortfolio(token);
      setProfile(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to ${published ? "publish" : "unpublish"} portfolio`,
      );
    }
  }

  const [busyConnect, setBusyConnect] = useState(false);

  async function handleConnectGithub() {
    setBusyConnect(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await grantConsent(token, "github_ingestion");
      const authorizeUrl = await fetchGithubOAuthUrl(token);
      window.location.href = authorizeUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start GitHub connection");
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
      toast.error(err instanceof Error ? err.message : "Failed to refresh stats");
    } finally {
      setRefreshBusy(false);
    }
  }

  const refreshCooldownUntil = profile?.stats_refreshed_at
    ? new Date(new Date(profile.stats_refreshed_at).getTime() + STATS_REFRESH_COOLDOWN_MS)
    : null;

  const githubStats = profile?.github_stats ?? null;
  const githubUsername = profile?.github_username ?? null;
  const devStatsLoading = profileResource.loading || githubResource.loading;
  const devStatsError = profileResource.error ?? githubResource.error;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:items-start max-w-7xl mx-auto w-full px-4 py-8">
      {profileResource.loading && !profile ? (
        <p className="text-sm text-zinc-500">Loading your profile…</p>
      ) : profileResource.error && !profile ? (
        <SectionError message={profileResource.error} onRetry={profileResource.retry} retrying={profileResource.loading} />
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
          <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
            <CardContent className="p-6">
              <EmptyState message="Loading Development Stats…" />
            </CardContent>
          </Card>
        ) : devStatsError && !githubResource.data ? (
          <SectionError message={devStatsError} onRetry={() => {
            profileResource.retry();
            githubResource.retry();
          }} retrying={devStatsLoading} />
        ) : !githubUsername || !githubStats || !githubResource.data ? (
          <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-sm text-zinc-500 font-medium">
                Connect GitHub to unlock Development Stats, achievements, and repository analytics.
              </p>
              <Button
                onClick={handleConnectGithub}
                disabled={busyConnect}
                className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-6 py-2"
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
            <Section title="Contribution Activity" index={0}>
              <div className="mb-4 flex flex-wrap items-center gap-6 text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono select-none">
                <span>
                  Contributions: <span className="font-extrabold text-zinc-700">{githubStats.total_contributions}</span>
                </span>
                <span>
                  Max Streak: <span className="font-extrabold text-zinc-700">{githubStats.longest_streak}d</span>
                </span>
                <span>
                  Current Streak: <span className="font-extrabold text-zinc-700">{githubStats.current_streak}d</span>
                </span>
              </div>
              <ContributionHeatmap days={githubStats.days} />
            </Section>

            {/* Row 2: Languages and Commit Activity (Side by Side) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Section title="Languages" index={1}>
                <LanguageChart projects={githubResource.data.projects} />
              </Section>
              <Section title="Commit Activity (weekly)" index={2}>
                <CommitActivityChart weeklyCounts={githubStats.commit_activity_weekly} />
              </Section>
            </div>

            {/* Row 3: Talent Score and Score History (Side by Side) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {talentResource.loading && !talentResource.data ? (
                <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
                  <CardContent className="p-6">
                    <EmptyState message="Loading your Talent Score…" />
                  </CardContent>
                </Card>
              ) : talentResource.error && !talentResource.data ? (
                <SectionError message={talentResource.error} onRetry={talentResource.retry} retrying={talentResource.loading} />
              ) : !talentResource.data?.latestScore ? (
                <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
                  <CardHeader className="pb-3 border-b border-zinc-100">
                    <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-400 uppercase">Connect evidence to get Talent Score</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="mb-4 text-xs text-zinc-500">
                      Connect GitHub and upload a resume to compute your first Talent Score.
                    </p>
                    <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium" render={<Link href="/profile/edit" />}>Get started</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
                    <CardHeader className="pb-3 border-b border-zinc-100 mb-4 flex flex-row items-center justify-between">
                      <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-400 uppercase">
                        Talent Score
                      </CardTitle>
                      <span className="font-heading text-xl font-extrabold text-indigo-600 font-mono">
                        {talentResource.data.latestScore.overall !== null ? talentResource.data.latestScore.overall.toFixed(1) : "—"}
                      </span>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScoreRadarChart subScores={talentResource.data.latestScore.sub_scores} />
                    </CardContent>
                  </Card>

                  <Section title="Score history" index={3}>
                    <ScoreTrendLine history={talentResource.data.scoreHistory} />
                  </Section>
                </>
              )}
            </div>

            {/* Row 4: Evidence Receipt & (Badges + Skills Matrix) (Side by Side) */}
            {talentResource.data?.latestScore && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <EvidenceReceipt score={talentResource.data.latestScore} />
                <div className="space-y-6">
                  <Section title="Badges" index={4}>
                    <BadgeGrid badges={talentResource.data.badges} />
                  </Section>
                  <Section title="Skills Matrix" index={5}>
                    <SkillsSection projects={githubResource.data.projects} />
                  </Section>
                </div>
              </div>
            )}

            {/* Row 5: GitHub Stats (Full Width) */}
            <Section title="GitHub Stats" index={6}>
              <GithubStatsCards summary={githubResource.data} />
            </Section>

            {/* Row 6: Repository Analytics (Full Width) */}
            <Section title="Repository Analytics" index={7}>
              <RepositoryGrid projects={githubResource.data.projects} />
            </Section>

            {/* Row 7: Problem Solving Stats (Full Width) */}
            {profile && (
              <ProblemSolvingStats leetcodeUsername={profile.leetcode_username} leetcodeStats={profile.leetcode_stats} />
            )}

            {/* Row 8: Achievements Portfolio (Full Width) */}
            <Section title="Achievements Portfolio" index={8}>
              <AchievementsGrid githubStats={githubStats} githubSummary={githubResource.data} projects={githubResource.data.projects} />
            </Section>
          </>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 pt-6 border-t border-zinc-200">
          <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 font-medium transition-colors" render={<Link href="/profile/edit" />}>
            {githubUsername ? "Update evidence" : "Connect evidence"}
          </Button>
          <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 font-medium transition-colors" render={<Link href="/resume-builder" />}>
            Build resume & portfolio
          </Button>
          <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 font-medium transition-colors" render={<Link href="/career" />}>
            AI Career Guidance
          </Button>
          <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 font-medium transition-colors" render={<Link href="/pitch-deck" />}>
            Pitch Deck Analyzer
          </Button>
        </div>
      </div>
    </div>
  );
}

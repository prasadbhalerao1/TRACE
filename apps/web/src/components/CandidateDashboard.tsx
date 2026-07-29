"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BadgeGrid } from "@/components/BadgeGrid";
import { EvidenceReceipt } from "@/components/EvidenceReceipt";
import { ScoreRadarChart } from "@/components/ScoreRadarChart";
import { ScoreTrendLine } from "@/components/ScoreTrendLine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboard, type DashboardResponse } from "@/lib/api";

export function CandidateDashboard() {
  const { getToken } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const data = await fetchDashboard(token);
        if (!cancelled) setDashboard(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!dashboard) return <p className="text-sm text-muted-foreground">Loading your Talent Score…</p>;

  const { latest_score, score_history, badges, profile } = dashboard;

  if (!latest_score) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Connect your evidence to get your Talent Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Connect GitHub and upload a resume to compute your first Talent Score.
          </p>
          <Button render={<Link href="/profile/edit" />}>Get started</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            Talent Score: {latest_score.overall !== null ? latest_score.overall.toFixed(1) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreRadarChart subScores={latest_score.sub_scores} />
        </CardContent>
      </Card>

      <EvidenceReceipt score={latest_score} />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Score history</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreTrendLine history={score_history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGrid badges={badges} />
        </CardContent>
      </Card>

      <Button variant="outline" render={<Link href="/profile/edit" />}>
        {profile.github_username ? "Update your evidence" : "Connect more evidence"}
      </Button>
    </div>
  );
}

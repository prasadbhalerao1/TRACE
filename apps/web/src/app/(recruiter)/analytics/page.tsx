"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelChart } from "@/components/FunnelChart";
import { TimeToHireHistogram } from "@/components/TimeToHireHistogram";
import {
  fetchHiringFunnel,
  fetchSourceBreakdown,
  fetchTimeToHire,
  type HiringFunnelResponse,
  type SourceBreakdownResponse,
  type TimeToHireResponse,
} from "@/lib/api";

export default function RecruiterAnalyticsPage() {
  const { getToken } = useAuth();
  const [funnel, setFunnel] = useState<HiringFunnelResponse | null>(null);
  const [timeToHire, setTimeToHire] = useState<TimeToHireResponse | null>(null);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdownResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const [f, t, s] = await Promise.all([
          fetchHiringFunnel(token),
          fetchTimeToHire(token),
          fetchSourceBreakdown(token),
        ]);
        if (cancelled) return;
        setFunnel(f);
        setTimeToHire(t);
        setSourceBreakdown(s);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const totalSourced = sourceBreakdown
    ? sourceBreakdown.direct + sourceBreakdown.copilot_search + sourceBreakdown.hackathon
    : 0;
  const hiredCount = funnel?.stages.find((s) => s.stage === "hired")?.count ?? 0;
  const sourcedCount = funnel?.stages.find((s) => s.stage === "sourced")?.count ?? 0;

  const metrics = [
    { label: "Total Applications", value: String(sourcedCount) },
    { label: "Hired", value: String(hiredCount) },
    {
      label: "Avg. Time to Hire",
      value: timeToHire?.median_days !== null && timeToHire?.median_days !== undefined
        ? `${timeToHire.median_days.toFixed(0)} days`
        : "—",
    },
    {
      label: "Copilot-Sourced",
      value: totalSourced > 0 ? `${Math.round((100 * (sourceBreakdown?.copilot_search ?? 0)) / totalSourced)}%` : "—",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Recruitment Analytics</h1>
        <p className="text-sm text-slate">Analyze hiring funnels, time-to-hire, and source-of-hire across your job postings.</p>
      </div>

      {error && <p className="text-sm text-rose-flagged">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{m.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-ink dark:text-zinc-50">{m.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hiring Funnel</CardTitle>
            <CardDescription>Conversion from sourced through hired, across all your job postings.</CardDescription>
          </CardHeader>
          <CardContent>
            {funnel ? <FunnelChart funnel={funnel} /> : <p className="text-sm text-slate">Loading…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Time to Hire</CardTitle>
            <CardDescription>Days from application to the &quot;Hired&quot; stage.</CardDescription>
          </CardHeader>
          <CardContent>
            {timeToHire ? <TimeToHireHistogram timeToHire={timeToHire} /> : <p className="text-sm text-slate">Loading…</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Source of Hire</CardTitle>
          <CardDescription>Direct application vs. Recruiter Copilot search vs. hackathon-sourced (FR-4.3).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm text-slate">
          <div>
            <span className="text-xs text-muted-foreground block">Direct</span>
            <span className="font-semibold text-ink dark:text-zinc-50">{sourceBreakdown?.direct ?? "—"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Copilot Search</span>
            <span className="font-semibold text-ink dark:text-zinc-50">{sourceBreakdown?.copilot_search ?? "—"}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Hackathon</span>
            <span className="font-semibold text-ink dark:text-zinc-50">{sourceBreakdown?.hackathon ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

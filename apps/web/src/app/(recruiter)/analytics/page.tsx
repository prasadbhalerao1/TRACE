"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecruiterAnalyticsPage() {
  const metrics = [
    { label: "Total Candidates Matched", value: "254" },
    { label: "AI Interviews Conducted", value: "118" },
    { label: "Avg. Time to Hire", value: "14 Days" },
    { label: "Match Integrity Rate", value: "98.5%" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Recruitment Analytics</h1>
        <p className="text-sm text-slate">Analyze hiring funnels, assessment completion metrics, and match effectiveness.</p>
      </div>

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
            <CardTitle className="text-base font-semibold">Funnel Metrics</CardTitle>
            <CardDescription>Conversion metrics from initial matching to offer letters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate">
            <div className="flex justify-between border-b pb-1">
              <span>Matched Profiles</span>
              <span className="font-semibold text-ink dark:text-zinc-50">100% (254)</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>Screening Passed</span>
              <span className="font-semibold text-ink dark:text-zinc-50">46% (118)</span>
            </div>
            <div className="flex justify-between border-b pb-1">
              <span>Interview Conducted</span>
              <span className="font-semibold text-ink dark:text-zinc-50">19% (48)</span>
            </div>
            <div className="flex justify-between pb-1">
              <span>Hired</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">4% (10)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Match Efficiency Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
            <p>Calculates candidate alignment values against target criteria. Overlaps are mapped dynamically using cosine similarities on Qdrant cloud nodes.</p>
            <p>Provides insights into talent availability, required skills density, and common gaps in application pools.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/02-SRS-AI-Recruitment-Platform.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Analytics Engine**: Fetches data from `/analytics`. Visualizes candidate conversion, pipeline velocity, and diversity statistics using Recharts.</p>
        </CardContent>
      </Card>
    </div>
  );
}

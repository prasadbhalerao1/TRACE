"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruiterTopPerformersPage() {
  const topPerformers = [
    { rank: 1, name: "Alice Johnson", hackathon: "Winter Dev Challenge 2026", score: 98.4, project: "Decentralized Auth Node", badge: "Golang Expert" },
    { rank: 2, name: "Charlie Brown", hackathon: "Winter Dev Challenge 2026", score: 94.1, project: "Real-time Data Pipeline", badge: "Data Pipeline Specialist" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Top Hackathon Performers</h1>
        <p className="text-sm text-slate">Discover verified candidates based on recent hackathon rankings and judge reviews.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Leaderboard Top Performers</CardTitle>
            <CardDescription>Verified competitor standings and project details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPerformers.map((p) => (
              <Card key={p.rank} className="hover:border-primary transition-all">
                <CardHeader className="flex flex-row justify-between items-start gap-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">#{p.rank} {p.name}</CardTitle>
                    <CardDescription>{p.hackathon}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Score: {p.score}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate">
                  <p><span className="font-medium text-ink dark:text-zinc-50">Project:</span> {p.project}</p>
                  <p><span className="font-medium text-ink dark:text-zinc-50">Awarded Badge:</span> <Badge variant="secondary" className="text-xs">{p.badge}</Badge></p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recruiting Pipeline Integration</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Top performers feed is compiled automatically after a hackathon organizer finalizes rankings (`hackathon.rankings.finalized` event).</p>
              <p>Ensures immediate visibility for recruiters into top talent without relying on resume screening alone.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Event Triggers**: The `hackathon.rankings.finalized` event publishes a notification feed record inside candidate watches, linking their profile directly to recruiters&apos; dashboards.</p>
        </CardContent>
      </Card>
    </div>
  );
}

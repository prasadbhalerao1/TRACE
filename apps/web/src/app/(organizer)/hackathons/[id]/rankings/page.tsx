"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function OrganizerRankingsPage() {
  const params = useParams<{ id: string }>();
  const [finalized, setFinalized] = useState(false);

  function handleFinalize() {
    setFinalized(true);
  }

  const mockRankings = [
    { rank: 1, team: "Coders A", project: "Decentralized Auth Node", score: 98.4 },
    { rank: 2, team: "Build Team B", project: "Real-time Data Pipeline", score: 94.1 }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Leaderboard Rankings</h1>
        <p className="text-sm text-slate">Compile competitor scores, verify judge rubrics, and finalize event standings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Rankings: {params.id}</CardTitle>
              <CardDescription>Standings calculated from combined judge and system scoring.</CardDescription>
            </div>
            {!finalized ? (
              <Button onClick={handleFinalize}>Finalize Rankings</Button>
            ) : (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Finalized</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRankings.map((r) => (
              <div key={r.rank} className="flex justify-between items-center p-3 border rounded-md bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="font-semibold text-sm">#{r.rank} Team {r.team}</h4>
                  <p className="text-xs text-slate mt-0.5">Project: {r.project}</p>
                </div>
                <span className="font-semibold text-ink dark:text-zinc-50">{r.score} Pts</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Action Trigger Details</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Finalizing standings triggers the **hackathon.rankings.finalized** event chain:</p>
              <p>1. Automatically assigns achievement badges to winning candidate team members.</p>
              <p>2. Transmits notification alerts to recruiter watchlists.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Finalize Standings Event**: Resolves through standard Celery/Arq workers subscribed to event logs, creating candidate badge associations and populating search indexes.</p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PublicLeaderboardPage() {
  const params = useParams<{ id: string }>();

  const mockRankings = [
    { rank: 1, teamId: "team-a", team: "Coders A", project: "Decentralized Auth Node", score: 98.4 },
    { rank: 2, teamId: "team-b", team: "Build Team B", project: "Real-time Data Pipeline", score: 94.1 }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-ink">Public Leaderboard</h1>
        <p className="text-sm text-slate">Live standings for Hackathon: {params.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Standings</CardTitle>
            <CardDescription>Standings calculated from combined judge and system scoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRankings.map((r) => (
              <div key={r.rank} className="flex justify-between items-center p-4 border rounded-md bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="font-semibold text-sm">#{r.rank} Team {r.team}</h4>
                  <p className="text-xs text-slate mt-0.5">Project: {r.project}</p>
                  <Link href={`/hackathons/${params.id}/teams/${r.teamId}`} className="text-xs text-blue-600 font-semibold hover:underline block mt-1">
                    View Team Details →
                  </Link>
                </div>
                <span className="font-semibold text-ink dark:text-zinc-50">{r.score} Pts</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Public Leaderboard Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>This is a publicly accessible, SSR-rendered leaderboard (per doc 00 §2.1) viewable by candidate participants, judges, recruiters, and the general public alike.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

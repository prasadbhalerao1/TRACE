"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { fetchPublicHackathon, fetchPublicHackathonRankings, type HackathonResponse, type RankingResponse } from "@/lib/api";

export default function PublicLeaderboardPage() {
  const params = useParams<{ id: string }>();
  const [hackathon, setHackathon] = useState<HackathonResponse | null>(null);
  const [rankings, setRankings] = useState<RankingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [h, r] = await Promise.all([
          fetchPublicHackathon(params.id),
          fetchPublicHackathonRankings(params.id),
        ]);
        setHackathon(h);
        setRankings(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-ink">Public Leaderboard</h1>
        <p className="text-sm text-slate">Live standings for {hackathon?.name ?? `Hackathon: ${params.id}`}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Standings</CardTitle>
            <CardDescription>Standings calculated from combined judge and system scoring.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-slate">Loading…</p>}
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            {!loading && rankings.length === 0 && (
              <p className="text-sm text-slate">Rankings haven&apos;t been finalized yet.</p>
            )}
            {rankings.map((r) => (
              <div key={r.id} className="flex justify-between items-center p-4 border rounded-md bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="font-semibold text-sm">#{r.rank} Team {r.team_name ?? r.team_id}</h4>
                  <Link href={`/hackathons/${params.id}/teams/${r.team_id}`} className="text-xs text-blue-600 font-semibold hover:underline block mt-1">
                    View Team Details →
                  </Link>
                </div>
                <span className="font-semibold text-ink dark:text-zinc-50">{r.composite_score.toFixed(1)} Pts</span>
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
              <p>Publicly viewable, no sign-in required — candidates, judges, recruiters, and the general public all see the same finalized standings.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

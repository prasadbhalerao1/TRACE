"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchTopPerformersFeed, type TopPerformerEntry } from "@/lib/api";

export default function RecruiterTopPerformersPage() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<TopPerformerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const feed = await fetchTopPerformersFeed(token);
        setEntries(feed.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load top performers");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

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
            <CardDescription>Top-3 finishers across all finalized hackathons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-slate">Loading…</p>}
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            {!loading && entries.length === 0 && (
              <p className="text-sm text-slate">No finalized hackathon rankings yet.</p>
            )}
            {entries.map((p, idx) => (
              <Card key={`${p.team_id}-${p.candidate_id ?? idx}`} className="hover:border-primary transition-all">
                <CardHeader className="flex flex-row justify-between items-start gap-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      #{p.rank} {p.candidate_github_username ?? p.team_name}
                    </CardTitle>
                    <CardDescription>{p.hackathon_name}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Score: {p.composite_score.toFixed(1)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate">
                  <p><span className="font-medium text-ink dark:text-zinc-50">Team:</span> {p.team_name}</p>
                  {p.candidate_headline && (
                    <p><span className="font-medium text-ink dark:text-zinc-50">Headline:</span> {p.candidate_headline}</p>
                  )}
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
              <p>Matching against your specific watchlist criteria is a Phase 2 integration — this feed currently shows every recent top-3 finisher.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

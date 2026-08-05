"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  finalizeHackathonRankings,
  fetchHackathonRankings,
  pollRankingStatus,
  type RankingResponse,
} from "@/lib/api";

export default function OrganizerRankingsPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [rankings, setRankings] = useState<RankingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const judgeWeight = 0.25;
  const pitchWeight = 0.25;
  const repoWeight = 0.25;
  const noveltyWeight = 0.25;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetchHackathonRankings(token, params.id);
        if (cancelled) return;
        setRankings(res);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load rankings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, params.id]);

  async function handleFinalize() {
    setFinalizing(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await finalizeHackathonRankings(token, params.id, {
        custom_weights: {
          judge_weight: judgeWeight,
          pitch_weight: pitchWeight,
          repo_weight: repoWeight,
          novelty_weight: noveltyWeight,
        },
      });
      // Finalization runs in the background now: the POST returns immediately and its
      // `rankings` are the previous run's, so poll for completion before re-fetching.
      const status = await pollRankingStatus(token, params.id);
      if (status.status === "failed") {
        setError(status.error ?? "Ranking finalization failed");
      } else if (status.status === "processing") {
        setError("Still finalizing — this is taking longer than expected. Refresh in a moment to see results.");
      }
      if (status.status !== "failed") {
        setRankings(await fetchHackathonRankings(token, params.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize rankings");
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading rankings…</div>;

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
              <CardTitle className="text-base font-semibold">Rankings</CardTitle>
              <CardDescription>Composite score = 0.40 judge + 0.30 pitch + 0.20 repo quality + 0.10 novelty.</CardDescription>
            </div>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? "Finalizing…" : rankings.length ? "Re-finalize Rankings" : "Finalize Rankings"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            {rankings.length === 0 && (
              <p className="text-sm text-slate">No rankings yet — click Finalize Rankings once teams have submitted.</p>
            )}
            {rankings.map((r) => (
              <div key={r.id} className="flex justify-between items-center p-3 border rounded-md bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="font-semibold text-sm">#{r.rank} {r.team_name ?? r.team_id}</h4>
                  {r.score_breakdown && (
                    <p className="text-xs text-slate mt-0.5">
                      Judge {r.score_breakdown.judge_score ?? "—"} · Pitch {r.score_breakdown.pitch_score ?? "—"} ·
                      {" "}Repo {r.score_breakdown.repo_quality_score ?? "—"} · Novelty {r.score_breakdown.novelty_score ?? "—"}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-ink dark:text-zinc-50">{r.composite_score.toFixed(1)} Pts</span>
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
              <p>Finalizing standings triggers the <strong>hackathon.rankings.finalized</strong> event, naming the top 3 teams and their candidate IDs for recruiter surfacing (Phase 2 consumer, Module 02).</p>
              <p>Re-finalizing after correcting a judge score is safe — rankings are upserted, not duplicated.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

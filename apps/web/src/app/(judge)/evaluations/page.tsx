"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { fetchJudgingQueue, type JudgeQueueEntry } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

export default function JudgeEvaluationsQueuePage() {
  const { getToken } = useAuth();
  const [queue, setQueue] = useState<JudgeQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        setQueue(await fetchJudgingQueue(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load evaluation queue");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Judge Evaluation Queue</h1>
        <p className="text-sm text-slate">Review submitted repos across every hackathon and score them.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submissions</CardTitle>
            <CardDescription>Select a team project submission to evaluate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <CardListSkeleton />}
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            {!loading && queue.length === 0 && <p className="text-sm text-slate">No submissions yet.</p>}
            {queue.map((sub) => (
              <div key={sub.submission_id} className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">Team {sub.team_name}</h4>
                  <p className="text-xs text-slate mt-0.5">{sub.hackathon_name}{sub.repo_url ? ` — ${sub.repo_url}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={sub.judge_score === null ? "secondary" : "outline"} className="capitalize">
                    {sub.judge_score === null ? "pending" : `scored ${sub.judge_score}`}
                  </Badge>
                  <Link
                    href={`/submissions/${sub.submission_id}?hackathonId=${sub.hackathon_id}`}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Evaluate →
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Scoring Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Every authenticated judge sees every submission — no per-judge/per-track assignment table exists yet.</p>
              <p>Judge ratings are combined with {"Module 03/04's"} automated scoring in the composite ranking formula.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

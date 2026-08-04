"use client";

// Doc/SRS/06 §9's `(admin)/fraud-review/page.tsx` — "review queue, evidence viewer,
// upheld/dismiss actions." Wired to `GET /admin/fraud-review-queue` (see
// .agents/decisions.md's Module 06 entry). Only `raised`/`under_review` flags show up
// here — once a human resolves one, it leaves this queue.

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFraudReviewQueue, FraudReviewQueueEntry } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

const CONFIDENCE_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function AdminFraudQueuePage() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<FraudReviewQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        setEntries(await fetchFraudReviewQueue(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load review queue");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Fraud & Trust Review Queue</h1>
        <p className="text-sm text-slate">
          Audit certificate, plagiarism, duplicate-profile, and AI-content signals flagged by system agents.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <CardListSkeleton />}
      {!loading && entries.length === 0 && <p className="text-sm text-slate">No flags currently awaiting review.</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Flagged Anomalies</CardTitle>
            <CardDescription>Select a flag to audit the full evidence trail and resolve it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {entries.map(({ flag, candidate_headline, candidate_github_username, has_dispute }) => {
              const confidence =
                typeof flag.evidence?.confidence_label === "string" ? (flag.evidence.confidence_label as string) : "low";
              return (
                <div
                  key={flag.id}
                  className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">
                      {candidate_headline ?? candidate_github_username ?? "Unknown candidate"}
                    </h4>
                    <p className="text-xs text-slate mt-0.5 capitalize">{flag.flag_type.replace(/_/g, " ")}</p>
                    {typeof flag.evidence?.report_summary === "string" && (
                      <p className="text-xs text-slate mt-0.5">{flag.evidence.report_summary as string}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {has_dispute && <Badge variant="secondary">Disputed</Badge>}
                    <Badge variant={CONFIDENCE_VARIANT[confidence] ?? "outline"}>{confidence} confidence</Badge>
                    <Badge variant="outline" className="capitalize">
                      {flag.status.replace(/_/g, " ")}
                    </Badge>
                    <Link href={`/fraud-review/${flag.id}`} className="text-xs text-blue-600 font-semibold hover:underline">
                      Review →
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Integrity Protocol</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Admin/recruiter reviewers audit evidence and make the final decision — the system never auto-decides.</p>
              <p>
                Allowed actions: `Dismiss` (no downstream effect either way), or `Uphold` (requires written review
                notes; only then does it count against the candidate&apos;s authenticity score).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

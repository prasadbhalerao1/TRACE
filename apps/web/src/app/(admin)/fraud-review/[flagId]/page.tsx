"use client";

// Doc/SRS/06 §9's `(admin)/fraud-review/[flagId]/page.tsx`. Wired to the real Module 06
// backend: `GET /flags/{id}` (evidence + candidate's dispute + Dispute Review Agent's
// assistive summary — which NEVER recommends a verdict, see
// `services/agents/fraud/tools/dispute_review_llm.py`) and
// `PATCH /flags/{id}/review` (the only place a flag can move to upheld/dismissed).
// `review_notes` is required client-side before an Uphold submit is even attempted,
// mirroring the backend's hard 422 rejection of an empty-notes uphold
// (`.agents/decisions.md`'s Module 06 entry) — this is a UX nicety on top of a real
// server-side guarantee, not a substitute for it.

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchFraudFlagDetail, FraudFlagDetailResponse, reviewFraudFlag } from "@/lib/api";

export default function AdminFlagAuditPage() {
  const params = useParams<{ flagId: string }>();
  const { getToken } = useAuth();

  const [detail, setDetail] = useState<FraudFlagDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState<"upheld" | "dismissed" | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);

  async function load() {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    setDetail(await fetchFraudFlagDetail(token, params.flagId));
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flag detail");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.flagId]);

  async function handleAction(status: "upheld" | "dismissed") {
    if (status === "upheld" && !reviewNotes.trim()) {
      setError("Review notes are required to uphold a flag.");
      return;
    }
    setSubmitting(status);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await reviewFraudFlag(token, params.flagId, { status, review_notes: reviewNotes || null });
      setResolution(status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(null);
    }
  }

  const evidenceItems = Array.isArray(detail?.flag.evidence?.signal_evidence)
    ? (detail!.flag.evidence.signal_evidence as string[])
    : [];
  const reportSummary =
    typeof detail?.flag.evidence?.report_summary === "string" ? (detail!.flag.evidence.report_summary as string) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Fraud Flag Review</h1>
        <p className="text-sm text-slate">Audit evidence and make a resolution choice on flag {params.flagId}.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-slate">Loading…</p>}

      {detail && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold capitalize">
                {detail.flag.flag_type.replace(/_/g, " ")}
              </CardTitle>
              <CardDescription>Review the evidence trail and the candidate&apos;s dispute, if any.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate">
              <div className="border-b pb-3">
                <span className="font-semibold text-ink dark:text-zinc-50">Fraud Risk Report:</span>
                <p className="text-xs text-slate mt-1">{reportSummary ?? "No narrative available."}</p>
              </div>

              <div className="border-b pb-3">
                <span className="font-semibold text-ink dark:text-zinc-50">Cited Evidence:</span>
                <ul className="text-xs text-slate mt-1 list-disc list-inside space-y-1">
                  {evidenceItems.length > 0 ? (
                    evidenceItems.map((item, i) => <li key={i}>{item}</li>)
                  ) : (
                    <li>No structured evidence items recorded.</li>
                  )}
                </ul>
              </div>

              {detail.dispute && (
                <div className="border-b pb-3">
                  <span className="font-semibold text-ink dark:text-zinc-50">Candidate Dispute Statement:</span>
                  <p className="text-xs text-slate mt-1">&quot;{detail.dispute.candidate_statement}&quot;</p>
                </div>
              )}

              {detail.dispute_review_assist.available && (
                <div className="border-b pb-3 bg-slate-50 dark:bg-slate-900/40 -mx-2 px-2 py-2 rounded">
                  <span className="font-semibold text-ink dark:text-zinc-50">
                    Dispute Review Agent (assistive summary — not a recommendation):
                  </span>
                  <p className="text-xs text-slate mt-1">{detail.dispute_review_assist.candidate_context_summary}</p>
                  <ul className="text-xs text-slate mt-1 list-disc list-inside space-y-1">
                    {detail.dispute_review_assist.points_of_agreement_or_conflict.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.flag.status === "raised" || detail.flag.status === "under_review" ? (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-medium text-slate">
                    Review notes (required to uphold; optional to dismiss):
                  </label>
                  <textarea
                    className="w-full min-h-20 p-3 border rounded text-sm bg-background text-foreground focus:outline-none"
                    placeholder="Explain the basis for your decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleAction("dismissed")}
                      variant="secondary"
                      disabled={submitting !== null}
                    >
                      {submitting === "dismissed" ? "Dismissing…" : "Dismiss Flag"}
                    </Button>
                    <Button
                      onClick={() => handleAction("upheld")}
                      variant="destructive"
                      disabled={submitting !== null || !reviewNotes.trim()}
                    >
                      {submitting === "upheld" ? "Upholding…" : "Uphold Flag"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm mt-4">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-400 capitalize">
                    Flag status: {resolution ?? detail.flag.status}
                  </h4>
                  <p className="text-xs text-slate mt-1">Reviewer notes: {detail.flag.review_notes ?? "(none)"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Audit Instructions</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
                <p>Weigh the evidence and any candidate dispute context. The AI summary above is assistive only — it never recommends a verdict.</p>
                <p>An Uphold decision requires written notes and is the only action that affects the candidate&apos;s authenticity score.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

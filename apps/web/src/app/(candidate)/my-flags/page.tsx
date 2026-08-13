"use client";

// Doc/SRS/06 §9's `(candidate)/my-flags/page.tsx` — "view flags against self, submit
// dispute." Wired to the real Module 06 backend (see .agents/decisions.md's Module 06
// entry): `raised`/`under_review` flags are shown as pending review, NEVER as a guilt
// verdict — the authenticity score card frames the same idea positively ("corroboration
// strength," doc 06 §5), matching the stub's own "Flags do not auto-reject candidates"
// copy, which is now backed by a real backend guarantee rather than mock text.

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AuthenticityScoreResponse,
  fetchAuthenticityScore,
  fetchCandidateFlags,
  fetchDashboard,
  FraudFlagResponse,
  submitFlagDispute,
} from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

const STATUS_LABEL: Record<string, string> = {
  raised: "Pending Review",
  under_review: "Under Review (dispute submitted)",
  upheld: "Upheld",
  dismissed: "Dismissed",
};

export default function CandidateFlagsPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [flags, setFlags] = useState<FraudFlagResponse[]>([]);
  const [score, setScore] = useState<AuthenticityScoreResponse | null>(null);
  const [disputeText, setDisputeText] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const dashboard = await fetchDashboard(token);
        const id = dashboard.profile.id;
        setCandidateId(id);
        const [flagsResult, scoreResult] = await Promise.all([
          fetchCandidateFlags(token, id),
          fetchAuthenticityScore(token, id),
        ]);
        setFlags(flagsResult);
        setScore(scoreResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flags");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  async function handleSubmitDispute(flagId: string) {
    const statement = (disputeText[flagId] ?? "").trim();
    if (!statement) return;
    setSubmittingId(flagId);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await submitFlagDispute(token, flagId, { candidate_statement: statement });
      setSubmittedIds((prev) => new Set(prev).add(flagId));
      if (candidateId) {
        setFlags(await fetchCandidateFlags(token, candidateId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Trust Flags & Disputes</h1>
        <p className="text-sm text-slate">Review system integrity flags raised on your profile and submit disputes.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <CardListSkeleton />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Profile Flags</CardTitle>
            <CardDescription>Integrity issues flagged by the platform&apos;s multi-agent checking system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && flags.length === 0 && (
              <p className="text-sm text-slate">No flags have been raised against your profile.</p>
            )}

            {flags.map((flag) => {
              const canDispute = flag.status === "raised";
              const alreadySubmitted = submittedIds.has(flag.id);
              const reportSummary =
                typeof flag.evidence?.report_summary === "string" ? (flag.evidence.report_summary as string) : null;
              return (
                <div
                  key={flag.id}
                  className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-md space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-semibold text-rose-flagged capitalize">
                        {flag.flag_type.replace(/_/g, " ")}
                      </h4>
                      <p className="text-xs text-slate mt-1">{reportSummary ?? "See evidence details."}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-rose-flagged text-white rounded">
                        Flagged: {new Date(flag.raised_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {STATUS_LABEL[flag.status] ?? flag.status}
                    </Badge>
                  </div>

                  {canDispute && !alreadySubmitted && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmitDispute(flag.id);
                      }}
                      className="space-y-2 pt-3 border-t"
                    >
                      <label className="text-xs font-medium text-slate">Explain the circumstances of this flag:</label>
                      <textarea
                        required
                        className="w-full min-h-20 p-3 border rounded text-sm bg-background text-foreground focus:outline-none"
                        placeholder="Provide details for review (e.g., shared starter template, coincidental overlap, etc.)"
                        value={disputeText[flag.id] ?? ""}
                        onChange={(e) => setDisputeText((prev) => ({ ...prev, [flag.id]: e.target.value }))}
                      />
                      <Button type="submit" disabled={submittingId === flag.id}>
                        {submittingId === flag.id ? "Submitting…" : "Submit Dispute"}
                      </Button>
                    </form>
                  )}

                  {(alreadySubmitted || flag.status === "under_review") && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm">
                      <p className="text-xs text-slate">
                        Your dispute has been submitted. Admin review has been scheduled — you will be notified of the
                        decision within 48 hours.
                      </p>
                    </div>
                  )}

                  {flag.status === "upheld" && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded text-sm">
                      <p className="text-xs text-slate">
                        This flag was upheld after human review. Reviewer notes: {flag.review_notes ?? "(none provided)"}
                      </p>
                    </div>
                  )}

                  {flag.status === "dismissed" && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm">
                      <p className="text-xs text-slate">This flag was reviewed and dismissed — no action was taken.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Authenticity Score</CardTitle>
              <CardDescription>Corroboration strength — not a guilt score.</CardDescription>
            </CardHeader>
            <CardContent>
              {score ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-ink">{score.score.toFixed(0)}</div>
                  <p className="text-xs text-slate mt-1">out of 100</p>
                  {score.components && score.components.penalties_applied.length > 0 && (
                    <p className="text-xs text-slate mt-2">
                      {score.components.penalties_applied.length} upheld issue(s) on record.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate">Not yet computed.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Integrity Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>
                **Proof over Paperwork**: TRACE maintains strict checks on code plagiarism, certificate
                authenticity, and duplicate profiles.
              </p>
              <p>
                Flags do **not** auto-reject candidates; only a flag a human reviewer upholds — with written
                notes — can ever affect anything downstream.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

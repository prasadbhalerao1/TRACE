"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSubmission, type SubmissionResponse } from "@/lib/api";

export default function RecruiterSubmissionReportPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchSubmission(token, params.id);
        if (!cancelled) setSubmission(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load submission");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, params.id]);

  if (error) return <div className="p-8 text-rose-flagged">{error}</div>;
  if (!submission) return <div className="p-8 text-slate">Loading submission report…</div>;

  const testResults = submission.test_results?.results ?? [];
  const passed = testResults.filter((r) => r.passed).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Assessment Submission Report</h1>
        <p className="text-sm text-slate">Test results, static analysis, and LLM code review for this submission.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Submission: {params.id}</CardTitle>
            <CardDescription>Candidate {submission.candidate_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm font-semibold">Score</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {submission.score?.toFixed(0) ?? "—"} / 100
              </span>
            </div>

            {testResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-ink">Test Results ({passed}/{testResults.length} passed)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {testResults.map((r) => (
                    <Badge key={r.test_name} variant={r.passed ? "secondary" : "outline"} className="text-xs">
                      {r.test_name}: {r.passed ? "pass" : "fail"}
                    </Badge>
                  ))}
                </div>
                {submission.test_results?.rationale && (
                  <p className="text-xs text-slate">{submission.test_results.rationale}</p>
                )}
              </div>
            )}

            {submission.llm_review && (
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-sm font-semibold text-ink">LLM Code Review</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate">
                  <span>Readability: {submission.llm_review.readability?.toFixed(0) ?? "—"}/100</span>
                  <span>Architecture: {submission.llm_review.architecture?.toFixed(0) ?? "—"}/100</span>
                </div>
                {submission.llm_review.red_flags.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-rose-flagged">
                    {submission.llm_review.red_flags.map((flag, i) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                )}
                {submission.llm_review.rationale && (
                  <p className="text-xs text-slate">{submission.llm_review.rationale}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Static Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              {submission.static_analysis?.skipped ? (
                <p>{submission.static_analysis.skipped}</p>
              ) : (
                <>
                  {submission.static_analysis?.radon && (
                    <p>Complexity (radon): avg {String(submission.static_analysis.radon.avg_complexity ?? "—")}</p>
                  )}
                  {submission.static_analysis?.bandit && (
                    <p>Security findings (bandit): {String(submission.static_analysis.bandit.issue_count ?? 0)}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

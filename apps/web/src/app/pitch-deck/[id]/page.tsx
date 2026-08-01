"use client";

import { useAuth } from "@/components/AuthProvider";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AIContentSignalBadge } from "@/components/AIContentSignalBadge";
import { PitchScoreRadarChart } from "@/components/PitchScoreRadarChart";
import { PlagiarismMatchList } from "@/components/PlagiarismMatchList";
import { SlideViewer } from "@/components/SlideViewer";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPresentationReport, PITCH_SCORE_LABELS, type PresentationReportResponse } from "@/lib/api";

// Lives OUTSIDE any (role) route group — same reasoning as the shared /dashboard route
// (.agents/decisions.md): doc/SRS/04 §1/§2 says this module is "fully self-contained"
// and viewable by candidates, judges, recruiters, and investors alike, not just the
// uploader, so it can't live inside the (candidate)-only group's role guard.
export default function PitchDeckReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const { me, isLoaded, isSignedIn, error: meError } = useCurrentUser();
  const [report, setReport] = useState<PresentationReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (!me) return;
    if (me.onboarding_required || !me.profile) {
      router.replace("/onboarding");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const data = await fetchPresentationReport(token, params.id);
        if (cancelled) return;
        setReport(data);
        // Synchronous pipeline today (see graph.py docstring) — status is already
        // "done"/"failed" by the time upload returns, but poll briefly in case this
        // page is reached by a shared link before that request resolves.
        if (data.status === "processing") {
          timer = setTimeout(load, 2000);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report");
      }
    }

    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isLoaded, isSignedIn, me, getToken, router, params.id]);

  if (meError) return <div className="p-8 text-sm text-destructive">{meError}</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!report) return <div className="p-8 text-sm text-muted-foreground">Loading pitch report…</div>;

  if (report.status === "failed") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Analysis failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This deck could not be processed. Try re-uploading, or check the file format.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (report.status === "processing") {
    return (
      <div className="mx-auto w-full max-w-2xl p-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Analyzing your deck…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-full animate-pulse rounded-full bg-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Extracting slides, scoring problem clarity/innovation/feasibility, and checking for plagiarism —
              this usually takes under a minute. This page updates automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            Overall Pitch Score: {report.overall_pitch_score !== null ? report.overall_pitch_score.toFixed(1) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PitchScoreRadarChart scores={report.scores} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Score breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(PITCH_SCORE_LABELS).map(([key, label]) => {
            const sub = report.scores[key];
            const wasRenormalized = report.renormalized_scores.includes(key);
            return (
              <div key={key} className="border-b border-border pb-2 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {sub?.value !== null && sub?.value !== undefined
                      ? sub.value.toFixed(1)
                      : wasRenormalized
                        ? "N/A — reweighted"
                        : "N/A"}
                  </span>
                </div>
                {sub?.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{sub.rationale}</p>}
                {sub?.gaps && sub.gaps.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {sub.gaps.map((gap: string) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">{report.summary ?? "No summary available."}</p>
        </CardContent>
      </Card>

      {report.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Improvement suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
              {report.suggestions.map((s: string) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">AI-content signal</CardTitle>
        </CardHeader>
        <CardContent>
          <AIContentSignalBadge signal={report.ai_content_signal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Plagiarism matches</CardTitle>
        </CardHeader>
        <CardContent>
          <PlagiarismMatchList matches={report.plagiarism_matches} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Slides</CardTitle>
        </CardHeader>
        <CardContent>
          <SlideViewer slides={report.slides} />
        </CardContent>
      </Card>
    </div>
  );
}

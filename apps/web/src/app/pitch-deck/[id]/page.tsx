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
import { Page, PageHeader } from "@/components/common/PageHeader";
import { SectionError } from "@/components/common/SectionError";
import { CardListSkeleton } from "@/components/CardListSkeleton";
import {
  PITCH_SCORE_LABELS,
  pollPresentationReport,
  type PresentationReportResponse,
} from "@/lib/api";

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

    // Was a hand-rolled `setTimeout(load, 2000)` loop, which skipped `pollDelay` and
    // therefore kept polling in a hidden tab. The shared helper also gives this path
    // backoff and error tolerance, so a single blip no longer surfaces as a hard error
    // on a report that is merely still being computed.
    const controller = new AbortController();

    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        await pollPresentationReport(token, params.id, {
          signal: controller.signal,
          // Render the first response immediately — the pipeline is synchronous today,
          // so it is usually already terminal, and waiting for the poll to settle would
          // hold the skeleton up for no reason.
          onUpdate: (data) => {
            if (!controller.signal.aborted) setReport(data);
          },
        });
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Failed to load report",
          );
      }
    })();

    return () => controller.abort();
  }, [isLoaded, isSignedIn, me, getToken, router, params.id]);

  // `meError` and a report failure are both terminal for this page, so they share
  // one presentation instead of two differently-shaped bare strings.
  const blockingError = meError ?? error;
  if (blockingError) {
    return (
      <Page width="reading">
        <PageHeader title="Pitch deck report" />
        <SectionError
          message={blockingError}
          onRetry={() => window.location.reload()}
          // A full reload, not an in-place refetch, so this is never mid-retry.
          retrying={false}
        />
      </Page>
    );
  }

  if (!report) {
    return (
      <Page width="reading">
        <PageHeader title="Pitch deck report" />
        <CardListSkeleton />
      </Page>
    );
  }

  if (report.status === "failed") {
    return (
      <Page width="reading">
        <PageHeader
          title="Analysis failed"
          description="This deck could not be processed. Try re-uploading it, or check that the file format is supported."
        />
      </Page>
    );
  }

  if (report.status === "processing") {
    return (
      <Page width="reading">
        <PageHeader title="Analysing your deck…" />
        <div aria-live="polite" className="space-y-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full animate-pulse rounded-full bg-primary" />
          </div>
          <p className="text-body leading-relaxed text-muted-foreground">
            Extracting slides, scoring clarity, innovation and feasibility, and
            checking for plagiarism. This usually takes under a minute and the
            page updates on its own.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page width="reading" className="space-y-6">
      <PageHeader
        title="Pitch deck report"
        description={
          report.overall_pitch_score !== null
            ? `Overall score ${report.overall_pitch_score.toFixed(1)} out of 10, broken down below.`
            : "Scored across clarity, innovation and feasibility."
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Score profile</CardTitle>
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
              <div
                key={key}
                className="border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {label}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {sub?.value !== null && sub?.value !== undefined
                      ? sub.value.toFixed(1)
                      : wasRenormalized
                        ? "N/A — reweighted"
                        : "N/A"}
                  </span>
                </div>
                {sub?.rationale && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {sub.rationale}
                  </p>
                )}
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
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {report.summary ?? "No summary available."}
          </p>
        </CardContent>
      </Card>

      {report.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">
              Improvement suggestions
            </CardTitle>
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
          <PlagiarismMatchList
            matches={report.plagiarism_matches}
            checked={report.plagiarism_checked}
          />
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
    </Page>
  );
}

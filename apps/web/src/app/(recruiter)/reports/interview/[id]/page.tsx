"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchInterviewReport, type InterviewReportResponse } from "@/lib/api";

export default function RecruiterInterviewReportPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [report, setReport] = useState<InterviewReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchInterviewReport(token, params.id);
        if (!cancelled) setReport(result);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load interview report",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, params.id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!report)
    return (
      <div className="p-8 text-muted-foreground">Loading interview report…</div>
    );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          AI Interview Transcript & Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Full conversational transcript, ratings, and scoring rationale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Transcript: Session {params.id}
            </CardTitle>
            <CardDescription>
              Text-only transcript — no audio was recorded (doc 03 §3).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-card border rounded-md max-h-60 overflow-y-auto">
              {report.transcript.map((t) => (
                <p
                  key={t.turn_index}
                  className={
                    t.role === "agent"
                      ? "text-xs text-muted-foreground"
                      : "text-xs text-foreground"
                  }
                >
                  <strong>
                    {t.role === "agent" ? "AI Interviewer" : "Candidate"}
                  </strong>
                  : {t.text}
                </p>
              ))}
            </div>
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold text-foreground">
                Hiring Recommendation
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {report.hiring_recommendation ?? "Not yet generated."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Ratings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Technical Rating</span>
                <span className="font-semibold text-foreground">
                  {report.technical_rating?.toFixed(0) ?? "—"}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span>Communication Rating</span>
                <span className="font-semibold text-foreground">
                  {report.communication_rating?.toFixed(0) ?? "—"}/100
                </span>
              </div>
              <div className="flex justify-between">
                <span>Response Confidence Signal</span>
                <span className="font-semibold text-foreground">
                  {report.response_confidence_signal?.toFixed(0) ?? "—"}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Confidence/communication ratings are derived entirely from
                transcript text (hedging language, specificity) — never voice
                biometrics or emotion inference.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

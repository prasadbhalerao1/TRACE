"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanBoard } from "@/components/KanbanBoard";
import {
  fetchApplications,
  updateApplicationStage,
  type ApplicationStage,
  type ApplicationWithCandidateResponse,
} from "@/lib/api";

export default function RecruiterPipelinePage() {
  const params = useParams<{ jobId: string }>();
  const { getToken } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithCandidateResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const result = await fetchApplications(token, { jobId: params.jobId });
      setApplications(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    }
  }, [getToken, params.jobId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchApplications(token, { jobId: params.jobId });
        if (!cancelled) setApplications(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load pipeline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, params.jobId]);

  async function handleStageChange(applicationId: string, nextStage: ApplicationStage) {
    // Optimistic update so the drag feels instant; reconciled with a refetch after.
    setApplications((prev) =>
      prev?.map((a) => (a.id === applicationId ? { ...a, stage: nextStage } : a)) ?? prev,
    );
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await updateApplicationStage(token, applicationId, nextStage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage");
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Applicant Tracking (ATS) Pipeline</h1>
        <p className="text-sm text-slate">Drag, drop, and manage candidates across hiring stages.</p>
      </div>

      {error && <p className="text-sm text-rose-flagged">{error}</p>}
      {applications === null && !error && <p className="text-sm text-slate">Loading pipeline…</p>}
      {applications !== null && applications.length === 0 && (
        <p className="text-sm text-slate">No applications yet for this job posting.</p>
      )}
      {applications !== null && applications.length > 0 && (
        <KanbanBoard applications={applications} onStageChange={handleStageChange} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>sourced → screened → interview_scheduled → offered → rejected/hired. Drag a card between columns, or use the &quot;Advance →&quot; shortcut on each card.</p>
        </CardContent>
      </Card>
    </div>
  );
}

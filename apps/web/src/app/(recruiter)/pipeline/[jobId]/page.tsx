"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanBoard } from "@/components/KanbanBoard";
import { KanbanSkeleton } from "@/components/KanbanSkeleton";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import {
  fetchApplications,
  updateApplicationStage,
  type ApplicationStage,
  type ApplicationWithCandidateResponse,
} from "@/lib/api";

export default function RecruiterPipelinePage() {
  const params = useParams<{ jobId: string }>();
  const { getToken } = useAuth();

  const fetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchApplications(token, { jobId: params.jobId });
  }, [getToken, params.jobId]);
  // useAsyncResource owns the mount-fetch + cancellation-on-unmount pattern — previously
  // duplicated by hand between a useEffect body and a separate load() callback, which
  // fired the same request twice on mount.
  const { data: fetchedApplications, error: fetchError, retry } = useAsyncResource(
    fetcher,
    `pipeline:${params.jobId}`,
  );

  // Local override so optimistic drag updates apply instantly on top of the fetched
  // data. Reset during render (not in an effect — see React's "adjusting state during
  // render" pattern) whenever a fresh fetch result lands, identified by that array's
  // identity changing; retry() only bumps a tick and returns before the refetch
  // resolves, so clearing the override eagerly on the retry() call itself would flash
  // the stale pre-drag state back in for the gap until the new fetch actually lands.
  const [override, setOverride] = useState<ApplicationWithCandidateResponse[] | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [lastSeenFetched, setLastSeenFetched] = useState(fetchedApplications);
  if (fetchedApplications !== lastSeenFetched) {
    setLastSeenFetched(fetchedApplications);
    setOverride(null);
  }
  const applications = override ?? fetchedApplications;
  const error = stageError ?? fetchError;

  async function handleStageChange(applicationId: string, nextStage: ApplicationStage) {
    setOverride((applications ?? []).map((a) => (a.id === applicationId ? { ...a, stage: nextStage } : a)));
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await updateApplicationStage(token, applicationId, nextStage);
    } catch (err) {
      setStageError(err instanceof Error ? err.message : "Failed to update stage");
      // Roll back the optimistic update by re-syncing from the server — on success the
      // optimistic state already matches, so no refetch is needed there.
      retry();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Applicant Tracking (ATS) Pipeline</h1>
        <p className="text-sm text-slate">Drag, drop, and manage candidates across hiring stages.</p>
      </div>

      {error && <p className="text-sm text-rose-flagged">{error}</p>}
      {applications === null && !error && <KanbanSkeleton />}
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

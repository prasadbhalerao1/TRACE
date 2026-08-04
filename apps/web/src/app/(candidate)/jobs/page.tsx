"use client";

import { useAuth } from "@/components/AuthProvider";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applyToJob, fetchOpenJobs, fetchMyApplications, type JobResponse } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

// QA_FINDINGS_20260729 Candidate #3: "Apply to jobs" was unreachable — applyToJob()
// existed in lib/api.ts but no page called it, and the only listing endpoint
// (`GET /jobs`) is recruiter-only and 403s a candidate token, so there was no way to
// even discover a job_id to apply to. Fixed by adding a new, additive, candidate-role
// `GET /jobs/open` endpoint (services/api/routers/recruitment.py) rather than touching
// the existing recruiter-scoped `GET /jobs` — see .agents/decisions.md for the full
// rationale. This page calls that new endpoint.
export default function CandidateJobsPage() {
  const { getToken } = useAuth();
  const [jobs, setJobs] = useState<JobResponse[] | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");

    // My applications is candidate-role and always works — load it regardless so
    // already-applied jobs can be marked even if the open-jobs list itself fails.
    const applications = await fetchMyApplications(token).catch(() => []);
    setAppliedJobIds(new Set(applications.map((a) => a.job_id)));

    const result = await fetchOpenJobs(token);
    setJobs(result);
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load jobs");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function handleApply(jobId: string) {
    setBusyJobId(jobId);
    setFeedback((prev) => ({ ...prev, [jobId]: "" }));
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await applyToJob(token, jobId);
      setAppliedJobIds((prev) => new Set(prev).add(jobId));
      setFeedback((prev) => ({ ...prev, [jobId]: "Applied!" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply";
      setFeedback((prev) => ({
        ...prev,
        [jobId]: message.includes("already_applied") ? "Already applied" : message,
      }));
    } finally {
      setBusyJobId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Browse Jobs</h1>
        <p className="text-sm text-slate">Find an open role and apply — your application is tracked on the Applications page.</p>
      </div>

      {error && <p className="text-sm text-rose-flagged">{error}</p>}

      {!error && jobs === null && <CardListSkeleton />}
      {jobs !== null && jobs.length === 0 && (
        <p className="text-sm text-slate">No open jobs right now — check back later.</p>
      )}

      <div className="space-y-4">
        {jobs?.map((job) => {
          const applied = appliedJobIds.has(job.id);
          return (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-semibold">{job.title}</CardTitle>
                    <CardDescription>
                      {job.location ?? (job.is_remote ? "Remote" : "Location not specified")}
                      {job.is_remote && job.location ? " • Remote" : ""}
                      {job.min_experience_years != null ? ` • ${job.min_experience_years}+ yrs experience` : ""}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    disabled={applied || busyJobId === job.id}
                    onClick={() => handleApply(job.id)}
                  >
                    {applied ? "Applied" : busyJobId === job.id ? "Applying…" : "Apply"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate whitespace-pre-line">{job.description}</p>
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                )}
                {feedback[job.id] && (
                  <p className={`text-xs ${feedback[job.id] === "Applied!" ? "text-teal-verified" : "text-rose-flagged"}`}>
                    {feedback[job.id]}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

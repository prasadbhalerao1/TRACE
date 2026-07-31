"use client";

import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { fetchJobs } from "@/lib/api";

export default function RecruiterJobsListPage() {
  const { getToken } = useAuth();
  const jobsFetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchJobs(token);
  }, [getToken]);
  // cacheKey: revisiting this list after viewing a job's matches/pipeline shows the
  // last-loaded postings instantly instead of re-paying the backend round-trip.
  const { data: jobs, error } = useAsyncResource(jobsFetcher, "job-postings:list");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Job Postings</h1>
          <p className="text-sm text-slate">Every job you&apos;ve posted, with quick links to matches and the pipeline.</p>
        </div>
        <Button render={<Link href="/jobs/new" />}>Post a Job</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Postings</CardTitle>
          <CardDescription>Click through to ranked matches or the kanban pipeline for any job.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-rose-flagged">{error}</p>}
          {!error && jobs === null && <p className="text-sm text-slate">Loading…</p>}
          {jobs !== null && jobs.length === 0 && (
            <p className="text-sm text-slate">No jobs posted yet — publish one to start matching candidates.</p>
          )}
          {jobs?.map((job) => (
            <div
              key={job.id}
              className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm"
            >
              <div>
                <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{job.title}</h4>
                <p className="text-xs text-slate mt-0.5">
                  {job.location ?? "Remote / unspecified"} · Posted {new Date(job.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button render={<Link href={`/jobs/${job.id}/matches`} />} variant="outline" size="sm">
                  Matches
                </Button>
                <Button render={<Link href={`/pipeline/${job.id}`} />} variant="outline" size="sm">
                  Pipeline
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

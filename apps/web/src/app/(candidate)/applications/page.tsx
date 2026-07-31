"use client";

import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { APPLICATION_STAGE_LABELS, fetchMyApplications } from "@/lib/api";

export default function CandidateApplicationsPage() {
  const { getToken } = useAuth();
  const applicationsFetcher = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No session token");
    return fetchMyApplications(token);
  }, [getToken]);
  const { data: applications, error } = useAsyncResource(applicationsFetcher, "applications:mine");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">My Job Applications</h1>
        <p className="text-sm text-slate">Track the status of your applications across the recruiter&apos;s pipeline.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Applications</CardTitle>
            <CardDescription>Track interview stages as recruiters move you through their pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            {!error && applications === null && <p className="text-sm text-slate">Loading…</p>}
            {applications !== null && applications.length === 0 && (
              <p className="text-sm text-slate">
                No applications yet —{" "}
                <Link href="/jobs" className="text-primary underline underline-offset-2">
                  apply to a job posting
                </Link>{" "}
                to see it tracked here.
              </p>
            )}
            {applications?.map((app) => (
              <div
                key={app.id}
                className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm"
              >
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{app.job_title}</h4>
                  <p className="text-xs text-slate mt-0.5">
                    {app.job_location ?? "Remote"} • Applied on {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={app.stage === "hired" ? "secondary" : "outline"} className="capitalize">
                  {APPLICATION_STAGE_LABELS[app.stage]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Pipeline Stages</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Sourced → Screened → Interview Scheduled → Offered → Hired/Rejected.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

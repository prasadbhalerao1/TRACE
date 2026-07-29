"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CandidateApplicationsPage() {
  const mockApplications = [
    { id: 1, title: "Senior Python Engineer", company: "DataAxle Corp", status: "screening", matchScore: 92.5, date: "2026-07-28" },
    { id: 2, title: "Frontend Engineer (Next.js)", company: "TechNova Inc", status: "applied", matchScore: 84.1, date: "2026-07-29" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">My Job Applications</h1>
        <p className="text-sm text-slate">Track the status of your applications and match scores for active positions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Applications</CardTitle>
            <CardDescription>Track interview stages and score calculations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockApplications.map((app) => (
              <div key={app.id} className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{app.title}</h4>
                  <p className="text-xs text-slate mt-0.5">{app.company} • Applied on {app.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Match Score</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{app.matchScore}%</span>
                  </div>
                  <Badge variant={app.status === "screening" ? "secondary" : "outline"} className="capitalize">
                    {app.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recruitment Pipeline Info</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>**3-Stage Evaluation**: Applications are matched using SQL queries, Qdrant profile vector similarity, and Claude Sonnet re-ranking before recruiter presentation.</p>
              <p>Pipelines stages: `applied`, `screening`, `interview`, `offer`, `rejected`, `hired` (Kanban standard).</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/02-SRS-AI-Recruitment-Platform.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Applications Schema**: Linked directly to the `job_applications` table. Real-time updates reflect recruiter state transitions on the Kanban pipeline.</p>
        </CardContent>
      </Card>
    </div>
  );
}

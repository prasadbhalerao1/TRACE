"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function JudgeEvaluationsQueuePage() {
  const mockSubmissions = [
    { id: "submission-1", team: "Coders A", project: "Decentralized Auth Node", status: "pending" },
    { id: "submission-2", team: "Build Team B", project: "Real-time Data Pipeline", status: "graded" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Judge Evaluation Queue</h1>
        <p className="text-sm text-slate">Review assigned project uploads and score them against the evaluation rubric.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Assigned Project Submissions</CardTitle>
            <CardDescription>Select a team project submission to evaluate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockSubmissions.map((sub) => (
              <div key={sub.id} className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">Team {sub.team}</h4>
                  <p className="text-xs text-slate mt-0.5">Project: {sub.project}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={sub.status === "pending" ? "secondary" : "outline"} className="capitalize">
                    {sub.status}
                  </Badge>
                  <Link href={`/submissions/${sub.id}`} className="text-xs text-blue-600 font-semibold hover:underline">
                    Evaluate →
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Scoring Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Judges score submissions independently using a 5-dimension rubric.</p>
              <p>Ratings are combined with automated test execution scores to calculate final standings.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Judging Workflow Scoping**: Scoped using judge permissions dependencies. Judges only see projects explicitly assigned to them by hackathon organizers.</p>
        </CardContent>
      </Card>
    </div>
  );
}

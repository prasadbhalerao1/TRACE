"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizerManageHackathonPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Manage Hackathon Event</h1>
        <p className="text-sm text-slate">Configure teams, assign judging rubrics, and finalize event tracks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Event Management: {params.id}</CardTitle>
            <CardDescription>Configure competitor rosters and allocate judges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate">
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-ink dark:text-zinc-50">Registered Teams</span>
              <span>12 Teams</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-semibold text-ink dark:text-zinc-50">Assigned Judges</span>
              <span>3 Judges</span>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-ink dark:text-zinc-50">Judge Assignments</h4>
              <div className="p-3 border rounded bg-slate-50 dark:bg-zinc-900 flex justify-between items-center">
                <div>
                  <p className="font-medium text-ink dark:text-zinc-50">Judge Alice</p>
                  <p className="text-xs text-slate mt-0.5">Assigned to: Track Full-Stack Dev</p>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Event Parameters</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Roster management links judges to candidate project submission IDs.</p>
              <p>Completed judging rubrics merge automatically with static code scoring metrics to compile final leaderboard rankings.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Roster & Track Management**: Connects candidate profiles, team registrations, and judge assignments inside the database, enabling secure, scoped judging workflows (FR-1.2).</p>
        </CardContent>
      </Card>
    </div>
  );
}

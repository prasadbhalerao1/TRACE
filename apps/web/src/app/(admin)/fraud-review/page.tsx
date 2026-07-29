"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminFraudQueuePage() {
  const mockFlags = [
    { id: "flag-1", candidate: "Alice Johnson", reason: "Tab Focus Violation during AI Interview", severity: "high", status: "pending" },
    { id: "flag-2", candidate: "Bob Smith", reason: "Near-identical coding structure matching candidate Alice", severity: "medium", status: "resolved" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Fraud & Trust Review Queue</h1>
        <p className="text-sm text-slate">Audit integrity anomalies, tab exits, and plagiarism signals flagged by system agents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Flagged Anomalies</CardTitle>
            <CardDescription>Select an anomaly flag record to audit and resolve.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockFlags.map((flag) => (
              <div key={flag.id} className="p-4 border rounded-md hover:border-primary transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm">
                <div>
                  <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{flag.candidate}</h4>
                  <p className="text-xs text-slate mt-0.5">{flag.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={flag.severity === "high" ? "destructive" : "secondary"}>
                    {flag.severity}
                  </Badge>
                  <Badge variant={flag.status === "pending" ? "outline" : "secondary"} className="capitalize">
                    {flag.status}
                  </Badge>
                  <Link href={`/fraud-review/${flag.id}`} className="text-xs text-blue-600 font-semibold hover:underline">
                    Review →
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Integrity Protocol</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Admin operators can perform audits on security logs and make final decisions on disputes.</p>
              <p>Allowed actions: `Dismiss` (clear flag from recruiter views), or `Uphold` (persist flag inside recruiter display panel).</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/06-SRS-Trust-Fraud-Prevention.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Audit Queue Endpoint**: Calls `GET /flags` to retrieve all logged anomalies. Operators must have the `admin` RBAC role assigned to update flag statuses.</p>
        </CardContent>
      </Card>
    </div>
  );
}

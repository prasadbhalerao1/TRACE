"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AdminFlagAuditPage() {
  const params = useParams<{ flagId: string }>();
  const [resolution, setResolution] = useState<string | null>(null);

  function handleAction(type: "dismiss" | "uphold") {
    setResolution(type);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Dispute Audit Review</h1>
        <p className="text-sm text-slate">Audit access credentials and make resolution choices on Flag {params.flagId}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Flag Audit details</CardTitle>
            <CardDescription>Review system logs and candidate explanations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate">
            <div className="border-b pb-2">
              <span className="font-semibold text-ink dark:text-zinc-50">Anomalous Activity:</span>
              <p className="text-xs text-slate mt-1">Tab focus lost 3 times during browser AI Interview session.</p>
            </div>
            <div className="border-b pb-2">
              <span className="font-semibold text-ink dark:text-zinc-50">Candidate Dispute explanation:</span>
              <p className="text-xs text-slate mt-1">&quot;My browser displayed a popup window alert requesting updates, which pulled the focus away. I dismissed it immediately.&quot;</p>
            </div>

            {!resolution ? (
              <div className="flex gap-4 pt-4 border-t">
                <Button onClick={() => handleAction("dismiss")} variant="secondary">Dismiss Anomaly Flag</Button>
                <Button onClick={() => handleAction("uphold")} variant="destructive">Uphold Anomaly Flag</Button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm mt-4">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400 capitalize">Flag status updated: {resolution}ed</h4>
                <p className="text-xs text-slate mt-1">Audit log updated and ledger state synchronized successfully.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Audit Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Compare access timestamps with browser telemetry logs to verify candidate explanations.</p>
              <p>Action logs are permanently recorded in the system audit logs.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/06-SRS-Trust-Fraud-Prevention.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Audit Resolution**: Resolves through `PATCH /flags/[id]/review`, requiring a structured review decision input and operator authentication tokens.</p>
        </CardContent>
      </Card>
    </div>
  );
}

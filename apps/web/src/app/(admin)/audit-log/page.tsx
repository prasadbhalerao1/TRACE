"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminAuditLogsPage() {
  const mockLogs = [
    { id: "log-1", action: "Complete Onboarding", user: "alice@dataaxle.com", ip: "192.168.1.1", time: "2026-07-29 17:40" },
    { id: "log-2", action: "Dismiss Fraud Anomaly Flag", user: "admin@platform.com", ip: "192.168.1.2", time: "2026-07-29 17:42" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">System Security Audit Logs</h1>
        <p className="text-sm text-slate">Examine immutable platform activity logs, action tracking, and operator modifications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Audit Records</CardTitle>
            <CardDescription>Activity details logged during user platform actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockLogs.map((log) => (
              <div key={log.id} className="p-3 border rounded-md text-xs bg-white dark:bg-zinc-900 shadow-sm space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-ink dark:text-zinc-50">{log.action}</span>
                  <span className="text-slate font-normal">{log.time}</span>
                </div>
                <div className="flex justify-between text-slate">
                  <span>Operator: {log.user}</span>
                  <span>IP: {log.ip}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Logging Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>All sensitive operations (role changes, onboarding, flags, disputes resolution) generate an immutable audit log entry.</p>
              <p>Logs contain operator authentication signatures, source network addresses, and data changes.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/00-Master-Architecture-and-Analysis.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Audit Logs Schema**: Logs are permanently saved to the `audit_logs` table. They cannot be edited or deleted by any user or administrator.</p>
        </CardContent>
      </Card>
    </div>
  );
}

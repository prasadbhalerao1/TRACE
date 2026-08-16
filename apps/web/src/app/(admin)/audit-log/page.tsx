"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchAuditLog, type AuditLogEntry } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleString();
}

function formatAction(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function AdminAuditLogsPage() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const data = await fetchAuditLog(token);
        if (cancelled) return;
        setLogs(data);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load audit log",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System Security Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Examine immutable platform activity logs, action tracking, and
          operator modifications.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Audit Records
            </CardTitle>
            <CardDescription>
              Most recent platform actions, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs === null && !error && <CardListSkeleton />}
            {logs !== null && logs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No audit log entries yet.
              </p>
            )}
            {logs?.map((log) => (
              <div
                key={log.id}
                className="p-3 border rounded-md text-xs bg-card shadow-flat space-y-1"
              >
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">
                    {formatAction(log.action)}
                  </span>
                  <span className="text-muted-foreground font-normal">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Actor: {log.actor_user_id ?? "system"}</span>
                  <span>
                    {log.target_type
                      ? `${log.target_type}: ${log.target_id}`
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Logging Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>
                All sensitive operations (role changes, onboarding, flags,
                disputes resolution) generate an immutable audit log entry.
              </p>
              <p>
                Logs are append-only — no update or delete path exists in the
                API.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Technical Reference:
            doc/multi-agent-architecture/00-master-architecture.md §4
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            **Audit Logs Schema**: Logs are permanently saved to the
            `audit_logs` table (`actor_user_id`, `action`, `target_type`,
            `target_id`, `created_at`). They cannot be edited or deleted by any
            user or administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

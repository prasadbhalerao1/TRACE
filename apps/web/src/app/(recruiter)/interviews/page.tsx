"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchMyInterviewDefinitions, type InterviewDefinitionResponse } from "@/lib/api";

export default function RecruiterInterviewsListPage() {
  const { getToken } = useAuth();
  const [definitions, setDefinitions] = useState<InterviewDefinitionResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchMyInterviewDefinitions(token);
        if (!cancelled) setDefinitions(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load interview definitions");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Interview Definitions</h1>
          <p className="text-sm text-slate">Reusable interview templates for your roles. Candidates can browse and self-serve.</p>
        </div>
        <Button render={<Link href="/interviews/new" />}>Create Interview</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Definitions</CardTitle>
          <CardDescription>Click through to edit questions, view candidate attempts, and ratings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-rose-flagged">{error}</p>}
          {!error && definitions === null && <p className="text-sm text-slate">Loading…</p>}
          {definitions !== null && definitions.length === 0 && (
            <p className="text-sm text-slate">No interview definitions yet — create one to start recruiting.</p>
          )}
          {definitions?.map((def) => (
            <div
              key={def.id}
              className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm"
            >
              <div>
                <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{def.title}</h4>
                <p className="text-xs text-slate mt-0.5">
                  {def.role_title} · {def.question_count} topics · Created {new Date(def.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button render={<Link href={`/interviews/${def.id}`} />} variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

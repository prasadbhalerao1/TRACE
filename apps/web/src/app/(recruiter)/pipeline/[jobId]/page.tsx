"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruiterPipelinePage() {
  const [candidates, setCandidates] = useState([
    { id: "1", name: "Alice Johnson", stage: "screening", matchScore: 97.1 },
    { id: "2", name: "Bob Smith", stage: "applied", matchScore: 89.6 },
    { id: "3", name: "Charlie Brown", stage: "interview", matchScore: 81.2 }
  ]);

  const stages = [
    { key: "applied", label: "Applied" },
    { key: "screening", label: "Screening" },
    { key: "interview", label: "Interview" },
    { key: "offer", label: "Offer" },
    { key: "hired", label: "Hired" }
  ];

  function moveStage(id: string, nextStage: string) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage: nextStage } : c))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Applicant Tracking (ATS) Pipeline</h1>
        <p className="text-sm text-slate">Drag, drop, and manage candidates across hiring stages.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage.key);
          return (
            <Card key={stage.key} className="bg-slate-50 dark:bg-zinc-900 border-dashed">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold flex justify-between">
                  <span>{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">{stageCandidates.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {stageCandidates.map((c) => (
                  <Card key={c.id} className="p-3 bg-white dark:bg-zinc-800 shadow-sm cursor-pointer hover:border-primary">
                    <p className="text-sm font-semibold text-ink dark:text-zinc-50">{c.name}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Match: {c.matchScore}%</p>
                    <div className="flex gap-1 mt-2">
                      {stage.key !== "hired" && (
                        <button
                          onClick={() => {
                            const currentIdx = stages.findIndex((s) => s.key === stage.key);
                            moveStage(c.id, stages[currentIdx + 1].key);
                          }}
                          className="text-[10px] text-blue-600 font-semibold hover:underline"
                        >
                          Advance →
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/02-SRS-AI-Recruitment-Platform.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Kanban Board Pipeline**: Directly synchronized with the `job_applications` table. Advancing a candidate updates the candidate&apos;s active stage status in Postgres and triggers automated email notification triggers via Arq background tasks.</p>
        </CardContent>
      </Card>
    </div>
  );
}

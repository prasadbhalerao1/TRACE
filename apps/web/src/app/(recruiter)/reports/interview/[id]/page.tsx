"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruiterInterviewReportPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">AI Interview Transcript & Report</h1>
        <p className="text-sm text-slate">Examine full conversational transcript, language flags, and scoring rationale.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Transcript: Session {params.id}</CardTitle>
            <CardDescription>Conversational transcript of browser-based Web Speech interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-900 border rounded-md max-h-60 overflow-y-auto">
              <p className="text-xs text-slate">**AI Interviewer**: How do you configure connection pooling in Python?</p>
              <p className="text-xs text-ink dark:text-zinc-50">**Candidate**: I usually use asyncpg with transaction-level pooling and configure statement cache sizes to zero on remote Neon endpoints...</p>
              <p className="text-xs text-slate">**AI Interviewer**: Great. How would you handle API authentication?</p>
            </div>
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold text-ink">Scoring Rationale</h4>
              <p className="text-xs text-slate mt-1">Candidate demonstrates detailed hands-on knowledge of Python DB interfaces, PgBouncer pooling limits, and FastAPI dependencies. Score: 95/100.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Identity & Trust</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>System verified applicant during session:</p>
              <div className="flex gap-2 items-center">
                <span>Tab focus checks:</span>
                <Badge variant="outline">Passed</Badge>
              </div>
              <div className="flex gap-2 items-center">
                <span>Plagiarism checking:</span>
                <Badge variant="outline">0 Matches</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/03-SRS-Assessment-Verification-System.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Interview Transcript Storage**: Text tokens are stored in the `interviews` table. Responses are parsed by Claude 3.5 Sonnet to populate structural scores and detect logical contradictions against resume data.</p>
        </CardContent>
      </Card>
    </div>
  );
}

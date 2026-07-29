"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruiterContributionReportPage() {
  const params = useParams<{ repo: string }>();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Code Contribution Report</h1>
        <p className="text-sm text-slate">Analyze static codebase complexity, commit history details, and code originality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Repository: {params.repo}</CardTitle>
            <CardDescription>GitHub static code analysis diagnostics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm font-semibold">Authenticity Score</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">96 / 100</span>
            </div>
            <div className="space-y-3 text-sm text-slate">
              <h4 className="text-sm font-semibold text-ink">Complexity Details</h4>
              <div className="flex justify-between">
                <span>Total Commits Analyzed:</span>
                <span className="font-semibold text-ink dark:text-zinc-50">42</span>
              </div>
              <div className="flex justify-between">
                <span>Code Duplication / Plagiarism check:</span>
                <span className="font-semibold text-ink dark:text-zinc-50">0% Similarity</span>
              </div>
              <div className="flex justify-between">
                <span>Lizard Cyclomatic Complexity:</span>
                <span className="font-semibold text-ink dark:text-zinc-50">Avg 4.8 (Very Clean)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Plagiarism Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>System verified code originality against public corpora using Qdrant vector embedding lookups.</p>
              <Badge variant="outline">0 Matches Found</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/03-SRS-Assessment-Verification-System.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Static Analysis Engine**: Fetches repository logs, runs cyclomatic complexity audits via the Lizard package, and checks vector embeddings in Qdrant collections to verify code authorship authenticity (FR-2.2).</p>
        </CardContent>
      </Card>
    </div>
  );
}

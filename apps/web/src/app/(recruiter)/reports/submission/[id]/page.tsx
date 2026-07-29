"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruiterSubmissionReportPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Pitch Deck Rubric Report</h1>
        <p className="text-sm text-slate">Review pitch deck upload diagnostics, slide details, and score breakdown.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Report Details for Submission: {params.id}</CardTitle>
            <CardDescription>PowerPoint pitch analysis results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm font-semibold">Overall Pitch Score</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">92.0 / 100</span>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-ink">Rubric Scores</h4>
              <div className="space-y-2 text-sm text-slate">
                <div className="flex justify-between">
                  <span>Innovation & Impact:</span>
                  <span className="font-semibold text-ink dark:text-zinc-50">95%</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical Feasibility:</span>
                  <span className="font-semibold text-ink dark:text-zinc-50">90%</span>
                </div>
                <div className="flex justify-between">
                  <span>Presentation Quality:</span>
                  <span className="font-semibold text-ink dark:text-zinc-50">92%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">AI Content Signal</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>System checked for structural AI generation markers:</p>
              <Badge variant="secondary">Likely Human (85% confidence)</Badge>
              <p className="mt-2">No repetitive slide templates or suspicious semantic phrasing detected.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/04-SRS-PPT-Analyzer.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Rubric Scoring pipeline**: Generates structured scores across 4 key criteria (Innovation, Feasibility, Design Quality, Business Potential). Slide texts and speaker notes are analyzed using Anthropic Sonnet rubric-scoring prompts.</p>
        </CardContent>
      </Card>
    </div>
  );
}

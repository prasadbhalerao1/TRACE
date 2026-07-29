"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function JudgeRubricPage() {
  const params = useParams<{ id: string }>();
  const [score, setScore] = useState("90");
  const [rationale, setRationale] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Rubric Scoring</h1>
        <p className="text-sm text-slate">Score submission {params.id} and provide qualitative rationale.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Evaluation Rubric</CardTitle>
            <CardDescription>Rate execution, code quality, and project design parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!submitted ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="score">Project Score (0-100)</Label>
                  <input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    required
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rationale">Qualitative Rationale</Label>
                  <textarea
                    id="rationale"
                    required
                    className="w-full min-h-24 p-3 border rounded text-sm bg-background text-foreground"
                    placeholder="Provide details on project strengths, flaws, and design execution..."
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Submit Evaluation</Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Evaluation Submitted</h4>
                <p className="text-xs text-slate mt-1">Rubric grading successfully logged. Standing computations will run when other judges finish grading.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Rubric Criteria</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Ratings are evaluated on:
                <br />• **Code Quality**: Design patterns & coverage.
                <br />• **Feasibility**: Practical operation.
                <br />• **Innovation**: Uniqueness of concept.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Submission Evaluation Schema**: Saves directly to the `judge_evaluations` table, which maps to project teams, events, and judging metadata.</p>
        </CardContent>
      </Card>
    </div>
  );
}

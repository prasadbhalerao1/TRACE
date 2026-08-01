"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitJudgeScore } from "@/lib/api";

export default function JudgeRubricPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const hackathonId = searchParams.get("hackathonId");
  const { getToken } = useAuth();
  const [score, setScore] = useState("90");
  const [rationale, setRationale] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hackathonId) {
      setError("Missing hackathonId — open this page from the Evaluations Queue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await submitJudgeScore(token, hackathonId, params.id, {
        score: Number(score),
        rationale: rationale || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
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
                {error && <p className="text-sm text-rose-flagged">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Evaluation"}
                </Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Evaluation Submitted</h4>
                <p className="text-xs text-slate mt-1">Rubric grading successfully logged. Standing computations will run when the organizer finalizes rankings.</p>
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
                <br />• <strong>Code Quality</strong>: Design patterns & coverage.
                <br />• <strong>Feasibility</strong>: Practical operation.
                <br />• <strong>Innovation</strong>: Uniqueness of concept.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

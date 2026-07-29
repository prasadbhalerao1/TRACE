"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/CodeEditor";
import { MCQForm } from "@/components/MCQForm";
import {
  fetchAssessment,
  submitAssessment,
  type AssessmentResponse,
  type CodingAssessmentSpec,
  type MCQAssessmentSpec,
  type SubmissionResponse,
  type TestResult,
} from "@/lib/api";
import { runHiddenTests } from "@/lib/pyodideRunner";

export default function CandidateAssessmentPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);
  const [code, setCode] = useState("def solve_problem(n):\n    # Write your Python code here\n    return n * 2\n");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchAssessment(token, params.id);
        if (!cancelled) setAssessment(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load assessment");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, params.id]);

  async function handleRunAndSubmit() {
    if (!assessment) return;
    setRunning(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      if (assessment.type === "coding") {
        const spec = assessment.spec as CodingAssessmentSpec;
        const results = await runHiddenTests(code, spec.hidden_tests);
        setOutput(results);
        const result = await submitAssessment(token, assessment.id, {
          code_or_answers: { code },
          test_results: results,
        });
        setSubmission(result);
      } else if (assessment.type === "mcq") {
        const result = await submitAssessment(token, assessment.id, {
          code_or_answers: { answers },
        });
        setSubmission(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setRunning(false);
    }
  }

  if (error) return <div className="p-8 text-rose-flagged">{error}</div>;
  if (!assessment) return <div className="p-8 text-slate">Loading assessment…</div>;

  const codingSpec = assessment.type === "coding" ? (assessment.spec as CodingAssessmentSpec) : null;
  const mcqSpec = assessment.type === "mcq" ? (assessment.spec as MCQAssessmentSpec) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {assessment.type === "mcq" ? "MCQ Assessment" : "Coding Assessment"}
          </h1>
          <p className="text-sm text-slate">
            {assessment.type === "coding"
              ? "Complete the coding challenge — tests run locally in your browser via Pyodide (WASM), never on our servers."
              : "Answer the questions below."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {assessment.type === "coding" ? "Python Editor" : "Questions"}
            </CardTitle>
            {codingSpec && <CardDescription>{codingSpec.problem_statement}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            {assessment.type === "coding" && (
              <CodeEditor value={code} onChange={setCode} />
            )}
            {assessment.type === "mcq" && mcqSpec && (
              <MCQForm spec={mcqSpec} answers={answers} onChange={setAnswers} />
            )}
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            <div className="flex justify-between">
              <Button onClick={handleRunAndSubmit} disabled={running || !!submission}>
                {running ? "Running…" : submission ? "Submitted" : assessment.type === "coding" ? "Run Tests & Submit" : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {codingSpec && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Constraints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate">
                <ul className="list-disc list-inside text-xs">
                  <li>{codingSpec.hidden_tests.length} hidden test case(s)</li>
                  <li>Function name: <code className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">solve_problem</code></li>
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Result</CardTitle>
            </CardHeader>
            <CardContent>
              {output && (
                <pre className="p-3 bg-slate-100 dark:bg-zinc-900 font-mono text-xs rounded border border-border whitespace-pre-wrap mb-3">
                  {output.map((r) => `${r.test_name}: ${r.passed ? "PASS" : "FAIL"}`).join("\n")}
                </pre>
              )}
              {submission ? (
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Score: {submission.score?.toFixed(0) ?? "—"}/100
                  </p>
                  {submission.test_results?.rationale && (
                    <p className="text-xs text-slate">{submission.test_results.rationale}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Run and submit to see your result.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

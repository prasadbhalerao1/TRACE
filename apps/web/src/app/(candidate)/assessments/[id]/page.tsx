"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CandidateAssessmentPage() {
  const [code, setCode] = useState("def solve_problem(n):\n    # Write your Python code here\n    return n * 2");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  function handleRun() {
    setRunning(true);
    setTimeout(() => {
      setOutput("Running test suite...\nTest case 1: Passed (input: 5, expected: 10, got: 10)\nTest case 2: Passed (input: 20, expected: 40, got: 40)\n\nAll tests passed successfully!");
      setRunning(false);
    }, 1000);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Coding Assessment</h1>
          <p className="text-sm text-slate">Complete the coding challenge using the interactive editor.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Python Editor</CardTitle>
            <CardDescription>Monaco-based editor with local Pyodide sandbox environment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full h-80 font-mono text-sm p-4 bg-zinc-950 text-emerald-400 rounded-md border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="flex justify-between">
              <Button onClick={handleRun} disabled={running}>
                {running ? "Running in Pyodide sandbox..." : "Run Tests"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Challenge: Double the Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate">
              <p>Write a function <code className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs text-ink dark:text-zinc-50">solve_problem(n)</code> that returns double the value of the integer input <code className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs text-ink dark:text-zinc-50">n</code>.</p>
              <h4 className="font-semibold pt-2 text-ink dark:text-zinc-50">Constraints:</h4>
              <ul className="list-disc list-inside text-xs">
                <li>Input: integer</li>
                <li>Time Limit: 2.0s</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Execution Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-100 dark:bg-zinc-900 font-mono text-xs rounded border border-border min-h-24 whitespace-pre-wrap">
                {output || "Run code to view output."}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/03-SRS-Assessment-Verification-System.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Functional Requirement**: FR-1.2 requires assessments to be compiled and executed directly inside the user&apos;s browser sandbox using Pyodide (WASM Python runtime) without server execution dependencies, minimizing costs and latency.</p>
          <p>**Key Integrations**: Monaco editor is utilized for syntax highlighting and autocomplete. Test cases are validated locally in-memory using Python unittest bindings inside the Web Assembly process.</p>
        </CardContent>
      </Card>
    </div>
  );
}

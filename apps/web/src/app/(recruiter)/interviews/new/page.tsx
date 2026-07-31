"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  generateDefinitionQuestions,
  createInterviewDefinition,
  type InterviewDefinitionQuestion,
  type InterviewDefinitionResponse,
} from "@/lib/api";

export default function RecruiterNewInterviewPage() {
  const { getToken } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");

  // Questions state
  const [questions, setQuestions] = useState<InterviewDefinitionQuestion[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Form progress
  const [step, setStep] = useState<"form" | "questions" | "created">("form");
  const [created, setCreated] = useState<InterviewDefinitionResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!roleTitle || !jobDescription) return;

    setGeneratingQuestions(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const result = await generateDefinitionQuestions(token, {
        role_title: roleTitle,
        job_description: jobDescription,
        years_experience: yearsExperience ? Number(yearsExperience) : undefined,
        question_count: 5,
      });

      setQuestions(result.questions);
      setStep("questions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setGeneratingQuestions(false);
    }
  }

  function updateQuestion(idx: number, topic: string) {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], topic };
    setQuestions(updated);
  }

  function removeQuestion(idx: number) {
    setQuestions(questions.filter((_, i) => i !== idx));
  }

  function addQuestion() {
    setQuestions([...questions, { id: String(questions.length), topic: "" }]);
  }

  async function handleCreateDefinition(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !roleTitle || questions.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const definition = await createInterviewDefinition(token, {
        title,
        role_title: roleTitle,
        job_description: jobDescription,
        years_experience: yearsExperience ? Number(yearsExperience) : undefined,
        questions,
        duration_minutes: durationMinutes ? Number(durationMinutes) : undefined,
      });

      setCreated(definition);
      setStep("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create interview definition");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Create Interview Definition</h1>
        <p className="text-sm text-slate">Set up a role-based interview template that candidates can take.</p>
      </div>

      {step === "form" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Role & Description</CardTitle>
            <CardDescription>Describe the role; we'll generate interview topics from this context.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateQuestions} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="roleTitle">Role Title</Label>
                <input
                  id="roleTitle"
                  required
                  className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                  placeholder="e.g. Senior Backend Engineer"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="jobDescription">Job Description</Label>
                <textarea
                  id="jobDescription"
                  required
                  className="w-full min-h-24 p-3 border rounded text-sm bg-background text-foreground"
                  placeholder="Describe key responsibilities, technologies, and skills..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="yearsExperience">Expected Experience (years)</Label>
                  <input
                    id="yearsExperience"
                    type="number"
                    min={0}
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    placeholder="e.g. 5"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="durationMinutes">Interview Duration (minutes)</Label>
                  <input
                    id="durationMinutes"
                    type="number"
                    min={10}
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-rose-flagged">{error}</p>}

              <Button type="submit" className="w-full" disabled={generatingQuestions}>
                {generatingQuestions ? "Generating Topics…" : "Generate Interview Topics"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "questions" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Interview Topics</CardTitle>
            <CardDescription>Edit the generated topics or add your own. Each topic becomes one interview question.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateDefinition} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="title">Interview Definition Title</Label>
                <input
                  id="title"
                  required
                  className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                  placeholder="e.g. Senior Backend Engineer - Round 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Topics (drag to reorder)</Label>
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <input
                        className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                        placeholder={`Topic ${idx + 1}`}
                        value={q.topic}
                        onChange={(e) => updateQuestion(idx, e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(idx)}>
                      Remove
                    </Button>
                  </div>
                ))}

                <Button type="button" variant="outline" className="w-full" onClick={addQuestion}>
                  + Add Topic
                </Button>
              </div>

              {error && <p className="text-sm text-rose-flagged">{error}</p>}

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("form")}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting || questions.length === 0}>
                  {submitting ? "Creating…" : "Create Definition"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === "created" && created && (
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm space-y-2">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Interview Definition Created</h4>
              <p className="text-xs text-slate">
                Your interview template is now live. Candidates can browse and take it via voice, camera, or text.
              </p>
              <Button render={<Link href={`/interviews/${created.id}`} />} className="w-full">
                View Definition & Attempts
              </Button>
              <Button render={<Link href="/interviews" />} variant="outline" className="w-full">
                Back to My Definitions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

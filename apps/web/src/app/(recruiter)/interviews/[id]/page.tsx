"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  fetchMyInterviewDefinitions,
  updateInterviewDefinition,
  fetchInterviewDefinitionAttempts,
  type InterviewDefinitionResponse,
  type InterviewDefinitionQuestion,
  type InterviewDefinitionAttempt,
} from "@/lib/api";

export default function RecruiterInterviewDetailPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [definition, setDefinition] = useState<InterviewDefinitionResponse | null>(null);
  const [attempts, setAttempts] = useState<InterviewDefinitionAttempt[]>([]);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [questions, setQuestions] = useState<InterviewDefinitionQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");

        const definitions = await fetchMyInterviewDefinitions(token);
        const def = definitions.find((d) => d.id === id);
        if (!def) {
          setError("Interview definition not found");
          setLoading(false);
          return;
        }

        setDefinition(def);
        setQuestions(def.questions);

        const attemptsData = await fetchInterviewDefinitionAttempts(token, id);
        setAttempts(attemptsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load interview definition");
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, id]);

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

  async function handleSaveQuestions() {
    if (!definition || questions.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const updated = await updateInterviewDefinition(token, id, { questions });
      setDefinition(updated);
      setEditingQuestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save questions");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-slate">Loading…</div>;
  if (error) return <div className="text-center py-12 text-rose-flagged">{error}</div>;
  if (!definition) return <div className="text-center py-12 text-slate">Definition not found</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{definition.title}</h1>
          <p className="text-sm text-slate">{definition.role_title} · {definition.question_count} topics</p>
        </div>
        <Button render={<Link href="/interviews" />} variant="outline">
          Back to Definitions
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Definition Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-slate">Role</p>
              <p className="font-semibold text-ink">{definition.role_title}</p>
            </div>
            <div>
              <p className="text-slate">Expected Experience</p>
              <p className="font-semibold text-ink">{definition.years_experience ?? "Not specified"} years</p>
            </div>
            <div>
              <p className="text-slate">Duration</p>
              <p className="font-semibold text-ink">{definition.duration_minutes ?? 30} minutes</p>
            </div>
            <div>
              <p className="text-slate">Status</p>
              <p className="font-semibold text-ink">{definition.is_active ? "Open" : "Closed"}</p>
            </div>
            <div>
              <p className="text-slate">Created</p>
              <p className="font-semibold text-ink">{new Date(definition.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Interview Topics</CardTitle>
            <CardDescription>Edit topics that will be asked to candidates</CardDescription>
          </CardHeader>
          <CardContent>
            {!editingQuestions ? (
              <div className="space-y-3">
                {definition.questions.map((q, idx) => (
                  <div key={q.id} className="p-3 border rounded bg-white dark:bg-zinc-900">
                    <p className="text-xs text-slate">Topic {idx + 1}</p>
                    <p className="text-sm font-semibold text-ink">{q.topic}</p>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEditingQuestions(true);
                    setQuestions(definition.questions);
                  }}
                >
                  Edit Topics
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Topic {idx + 1}</Label>
                      <input
                        className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
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

                {error && <p className="text-sm text-rose-flagged">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingQuestions(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={submitting || questions.length === 0}
                    onClick={handleSaveQuestions}
                  >
                    {submitting ? "Saving…" : "Save Topics"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Candidate Attempts</CardTitle>
          <CardDescription>Who has taken this interview and how they performed</CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-slate">No candidates have taken this interview yet.</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt) => (
                <div
                  key={attempt.session_id}
                  className="p-3 border rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-zinc-900"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{attempt.candidate_name || "Anonymous"}</p>
                    <p className="text-xs text-slate">
                      {attempt.status} · {new Date(attempt.started_at).toLocaleDateString()}
                    </p>
                  </div>
                  {attempt.has_report && (
                    <Button
                      render={<Link href={`/interview-sessions/${attempt.session_id}/report`} />}
                      size="sm"
                      variant="outline"
                    >
                      View Report
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

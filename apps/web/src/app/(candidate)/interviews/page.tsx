"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  fetchOpenInterviewDefinitions,
  generateDefinitionQuestions,
  startInterview,
  type InterviewDefinitionResponse,
  type InterviewDefinitionQuestion,
} from "@/lib/api";

export default function CandidateInterviewsPage() {
  const { getToken } = useAuth();

  // Browse state
  const [openDefinitions, setOpenDefinitions] = useState<InterviewDefinitionResponse[] | null>(null);
  const [loadingDefinitions, setLoadingDefinitions] = useState(true);

  // Practice interview creation state
  const [showCreatePractice, setShowCreatePractice] = useState(false);
  const [practiceRole, setPracticeRole] = useState("");
  const [practiceDesc, setPracticeDesc] = useState("");
  const [practiceYears, setPracticeYears] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState<InterviewDefinitionQuestion[]>([]);
  const [generatingPractice, setGeneratingPractice] = useState(false);

  // Navigation
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const definitions = await fetchOpenInterviewDefinitions(token);
        if (!cancelled) setOpenDefinitions(definitions);
      } catch {
        // Treat load failures as "no open interviews" rather than surfacing a raw fetch error.
        if (!cancelled) setOpenDefinitions([]);
      } finally {
        if (!cancelled) setLoadingDefinitions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleGeneratePracticeQuestions(e: React.FormEvent) {
    e.preventDefault();
    if (!practiceRole || !practiceDesc) return;

    setGeneratingPractice(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const result = await generateDefinitionQuestions(token, {
        role_title: practiceRole,
        job_description: practiceDesc,
        years_experience: practiceYears ? Number(practiceYears) : undefined,
        question_count: 5,
      });

      setPracticeQuestions(result.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate practice topics");
    } finally {
      setGeneratingPractice(false);
    }
  }

  async function handleStartDefinitionInterview(definitionId: string) {
    setStartingSession(definitionId);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const result = await startInterview(token, { interview_definition_id: definitionId });
      window.location.href = `/interview/${result.session_id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview");
      setStartingSession(null);
    }
  }

  async function handleStartPracticeInterview() {
    if (practiceQuestions.length === 0) {
      setError("No topics generated");
      return;
    }

    setStartingSession("practice");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const result = await startInterview(token, {
        topic_plan: practiceQuestions.map((q) => q.topic),
      });
      window.location.href = `/interview/${result.session_id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start practice interview");
      setStartingSession(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Interview Practice</h1>
        <p className="text-sm text-slate">Browse open interview templates or create your own practice interview.</p>
      </div>

      {/* Open Interview Definitions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Open Interviews</CardTitle>
          <CardDescription>Recruiters have published these interview templates. Take one to practice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-rose-flagged">{error}</p>}
          {loadingDefinitions && (
            <div className="flex items-center gap-2 py-6 justify-center text-slate">
              <span className="h-4 w-4 rounded-full border-2 border-slate/30 border-t-slate animate-spin" />
              <span className="text-sm">Loading open interviews…</span>
            </div>
          )}
          {!loadingDefinitions && openDefinitions?.length === 0 && (
            <p className="text-sm text-slate">No open interviews yet. Try creating a practice interview below.</p>
          )}
          {!loadingDefinitions && openDefinitions?.map((def) => (
            <div
              key={def.id}
              className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 shadow-sm"
            >
              <div>
                <h4 className="text-sm font-semibold text-ink dark:text-zinc-50">{def.title}</h4>
                <p className="text-xs text-slate mt-1">
                  {def.role_title} · {def.question_count} questions · {def.years_experience ?? "Not specified"} years experience
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleStartDefinitionInterview(def.id)}
                disabled={startingSession === def.id}
              >
                {startingSession === def.id ? "Starting…" : "Start"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Practice Interview Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Practice Interview</CardTitle>
          <CardDescription>
            Create a custom interview for any role. Describe the position and we'll generate topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCreatePractice ? (
            <Button className="w-full" variant="outline" onClick={() => setShowCreatePractice(true)}>
              Create Practice Interview
            </Button>
          ) : (
            <div className="space-y-4">
              {practiceQuestions.length === 0 ? (
                <form onSubmit={handleGeneratePracticeQuestions} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="practiceRole">Role Title</Label>
                    <input
                      id="practiceRole"
                      required
                      className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                      placeholder="e.g. Frontend Engineer"
                      value={practiceRole}
                      onChange={(e) => setPracticeRole(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="practiceDesc">Role Description</Label>
                    <textarea
                      id="practiceDesc"
                      required
                      className="w-full min-h-20 p-3 border rounded text-sm bg-background text-foreground"
                      placeholder="What does this role do? What skills matter?"
                      value={practiceDesc}
                      onChange={(e) => setPracticeDesc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="practiceYears">Years of Experience</Label>
                    <input
                      id="practiceYears"
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                      placeholder="e.g. 3"
                      value={practiceYears}
                      onChange={(e) => setPracticeYears(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowCreatePractice(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={generatingPractice}>
                      {generatingPractice ? "Generating…" : "Generate Topics"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Generated Topics</Label>
                    <div className="space-y-2 mt-2">
                      {practiceQuestions.map((q, idx) => (
                        <div key={q.id} className="p-3 border rounded bg-white dark:bg-zinc-900">
                          <p className="text-xs text-slate">Topic {idx + 1}</p>
                          <p className="text-sm font-semibold text-ink">{q.topic}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setPracticeQuestions([]);
                        setPracticeRole("");
                        setPracticeDesc("");
                        setPracticeYears("");
                      }}
                    >
                      Start Over
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleStartPracticeInterview}
                      disabled={startingSession === "practice"}
                    >
                      {startingSession === "practice" ? "Starting…" : "Start Interview"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

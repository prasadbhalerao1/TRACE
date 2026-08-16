"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InterviewLobby } from "@/components/interview/InterviewLobby";
import {
  fetchOpenInterviewDefinitions,
  generateDefinitionQuestions,
  startInterview,
  type InterviewDefinitionResponse,
  type InterviewDefinitionQuestion,
} from "@/lib/api";

export default function CandidateInterviewsPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  // Browse state
  const [openDefinitions, setOpenDefinitions] = useState<
    InterviewDefinitionResponse[] | null
  >(null);
  const [loadingDefinitions, setLoadingDefinitions] = useState(true);

  // Practice interview creation state
  const [showCreatePractice, setShowCreatePractice] = useState(false);
  const [practiceRole, setPracticeRole] = useState("");
  const [practiceDesc, setPracticeDesc] = useState("");
  const [practiceYears, setPracticeYears] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState<
    InterviewDefinitionQuestion[]
  >([]);
  const [generatingPractice, setGeneratingPractice] = useState(false);

  // Navigation
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The device-check lobby both entry points pass through. `definitionId` is null for a
  // generated practice interview (which starts from a topic_plan instead).
  const [lobby, setLobby] = useState<{
    definitionId: string | null;
    title: string;
    roleTitle?: string;
    topics: string[];
  } | null>(null);

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
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate practice topics",
      );
    } finally {
      setGeneratingPractice(false);
    }
  }

  /** Opens the lobby for a recruiter-published definition. This used to call
   * startInterview() directly on click, so the candidate was dropped into a live
   * session with no chance to check their camera or mic first. */
  function openDefinitionLobby(definition: InterviewDefinitionResponse) {
    setError(null);
    setLobby({
      definitionId: definition.id,
      title: definition.title,
      roleTitle: definition.role_title,
      topics: definition.questions.map((q) => q.topic),
    });
  }

  function openPracticeLobby() {
    if (practiceQuestions.length === 0) {
      setError("No topics generated");
      return;
    }
    setError(null);
    setLobby({
      definitionId: null,
      title: "Practice interview",
      roleTitle: practiceRole || undefined,
      topics: practiceQuestions.map((q) => q.topic),
    });
  }

  /** Single join path for both entry points — the session is only created once the
   * candidate has actually passed the device check. */
  async function handleJoinFromLobby() {
    if (!lobby) return;
    setStartingSession(lobby.definitionId ?? "practice");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");

      const result = await startInterview(
        token,
        lobby.definitionId
          ? { interview_definition_id: lobby.definitionId }
          : { topic_plan: lobby.topics },
      );
      // router.push, not window.location.href: a full document reload throws away
      // the whole React tree and re-downloads the bundle just to change route.
      router.push(`/interview/${result.session_id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start interview",
      );
      setStartingSession(null);
    }
  }

  // The lobby takes over the page rather than rendering inside the browse list: it owns
  // a live camera preview, and keeping the rest of the page mounted behind it invites
  // the user to navigate away with the stream still running.
  if (lobby) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ready to join?
          </h1>
          <p className="text-sm text-muted-foreground">
            Check your camera and microphone before you start.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <InterviewLobby
          topics={lobby.topics}
          title={lobby.title}
          roleTitle={lobby.roleTitle}
          joining={startingSession !== null}
          onJoin={handleJoinFromLobby}
          onBack={() => {
            setLobby(null);
            setError(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Interview Practice
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse open interview templates or create your own practice interview.
        </p>
      </div>

      {/* Open Interview Definitions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Open Interviews
          </CardTitle>
          <CardDescription>
            Recruiters have published these interview templates. Take one to
            practice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loadingDefinitions && (
            <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
              <span className="h-4 w-4 rounded-full border-2 border-slate/30 border-t-slate animate-spin" />
              <span className="text-sm">Loading open interviews…</span>
            </div>
          )}
          {!loadingDefinitions && openDefinitions?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No open interviews yet. Try creating a practice interview below.
            </p>
          )}
          {!loadingDefinitions &&
            openDefinitions?.map((def) => (
              <div
                key={def.id}
                className="p-4 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card shadow-flat"
              >
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {def.title}
                  </h4>
                  {/* "topics", not "questions": the count is how many areas the
 interviewer will cover, and each one can spawn a follow-up when an
 answer is thin, so the number of questions asked is not fixed. */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {def.role_title} · {def.question_count} topics ·{" "}
                    {def.years_experience ?? "Not specified"} years experience
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openDefinitionLobby(def)}
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
          <CardTitle className="text-base font-semibold">
            Practice Interview
          </CardTitle>
          <CardDescription>
            Create a custom interview for any role. Describe the position and
            we&apos;ll generate topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showCreatePractice ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowCreatePractice(true)}
            >
              Create Practice Interview
            </Button>
          ) : (
            <div className="space-y-4">
              {practiceQuestions.length === 0 ? (
                <form
                  onSubmit={handleGeneratePracticeQuestions}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <Label htmlFor="practiceRole">Role Title</Label>
                    <input
                      id="practiceRole"
                      required
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background text-foreground"
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
                      className="w-full min-h-20 p-3 border rounded-md text-sm bg-background text-foreground"
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
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background text-foreground"
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
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={generatingPractice}
                    >
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
                        <div
                          key={q.id}
                          className="p-3 border rounded-md bg-card"
                        >
                          <p className="text-xs text-muted-foreground">
                            Topic {idx + 1}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {q.topic}
                          </p>
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
                      onClick={openPracticeLobby}
                      disabled={startingSession === "practice"}
                    >
                      {startingSession === "practice"
                        ? "Starting…"
                        : "Continue"}
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

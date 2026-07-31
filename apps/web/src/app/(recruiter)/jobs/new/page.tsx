"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createJob, pollMatchingStatus, type JobResponse } from "@/lib/api";

export default function RecruiterNewJobPage() {
  const { getToken } = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [isRemote, setIsRemote] = useState(true);
  const [created, setCreated] = useState<JobResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<"processing" | "done" | "failed">("processing");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !desc) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      const job = await createJob(token, {
        title,
        description: desc,
        required_skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        min_experience_years: minExperience ? Number(minExperience) : null,
        location: location || null,
        is_remote: isRemote,
      });
      setCreated(job);
      setMatchingStatus("processing");
      // Matching now runs as a background task — poll until it's done rather than
      // claiming "the AI Matching Engine has run" immediately after creation.
      const result = await pollMatchingStatus(token, job.id);
      setMatchingStatus(result.status === "failed" ? "failed" : "done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job posting");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Post a New Job Posting</h1>
        <p className="text-sm text-slate">Add a job listing to search, rank, and match candidates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Job Details</CardTitle>
            <CardDescription>Specify target roles, description, and required core skills.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!created ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="title">Job Title</Label>
                  <input
                    id="title"
                    required
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    placeholder="e.g. Senior Backend Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="desc">Description</Label>
                  <textarea
                    id="desc"
                    required
                    className="w-full min-h-24 p-3 border rounded text-sm bg-background text-foreground"
                    placeholder="Describe duties, tools used, and target outcomes..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="skills">Required Skills (Comma separated)</Label>
                  <input
                    id="skills"
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    placeholder="e.g. Python, FastAPI, PostgreSQL"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="location">Location</Label>
                    <input
                      id="location"
                      className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                      placeholder="e.g. Delhi"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="minExperience">Min Experience (years)</Label>
                    <input
                      id="minExperience"
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                      value={minExperience}
                      onChange={(e) => setMinExperience(e.target.value)}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate">
                  <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
                  Remote OK
                </label>
                {error && <p className="text-sm text-rose-flagged">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Publishing…" : "Publish Job Posting"}
                </Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm space-y-2">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Job Posting Created</h4>
                <p className="text-xs text-slate">
                  {matchingStatus === "processing" &&
                    "The AI Matching Engine is scoring candidates in the background…"}
                  {matchingStatus === "done" &&
                    "The AI Matching Engine has scored every candidate in the pool against this posting."}
                  {matchingStatus === "failed" &&
                    "Matching couldn't complete — you can retry from the matches page."}
                </p>
                <Button
                  render={<Link href={`/jobs/${created.id}/matches`} />}
                  className="w-full"
                  disabled={matchingStatus === "processing"}
                >
                  {matchingStatus === "processing" ? "Scoring…" : "View Ranked Matches"}
                </Button>
                <Button
                  render={<Link href={`/pipeline/${created.id}`} />}
                  variant="outline"
                  className="w-full"
                >
                  View Pipeline
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Matching Strategy</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Posting triggers the AI Job Matching Engine (doc 08 §2):</p>
              <p><strong>Skill Overlap</strong>: required skills vs. the candidate&apos;s verified (GitHub-corroborated) and self-declared skills.</p>
              <p><strong>Semantic Similarity</strong>: embedding similarity between the job description and the candidate&apos;s skills, blended with location/remote fit.</p>
              <p><strong>Experience Match</strong> and <strong>Talent Score Alignment</strong> round out the 4-term breakdown shown on every match.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

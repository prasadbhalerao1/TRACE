"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function RecruiterNewJobPage() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [created, setCreated] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !desc) return;
    setCreated(true);
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
                <Button type="submit" className="w-full">Publish Job Posting</Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Job Posting Created</h4>
                <p className="text-xs text-slate mt-1">AI Matching agents are currently running background index parses. Initial candidate matches will populate shortly.</p>
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
              <p>Posting triggers the **3-Stage Candidate Matcher**:</p>
              <p>**Stage 1**: Fast SQL query matching candidate profiles for location, experience constraints.</p>
              <p>**Stage 2**: Qdrant vector semantic search matching job descriptions to candidate profiles.</p>
              <p>**Stage 3**: Claude Sonnet re-ranking top matches with natural language reasoning.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/02-SRS-AI-Recruitment-Platform.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Job Schema**: Saves directly to the `jobs` table, defining parameters for embedding-generation pipelines.</p>
        </CardContent>
      </Card>
    </div>
  );
}

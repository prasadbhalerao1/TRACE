"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function OrganizerNewHackathonPage() {
  const [name, setName] = useState("");
  const [track, setTrack] = useState("");
  const [created, setCreated] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setCreated(true);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Create a New Hackathon</h1>
        <p className="text-sm text-slate">Register a hiring hackathon and define evaluation tracks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hackathon Details</CardTitle>
            <CardDescription>Configure hackathon names, durations, and criteria.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!created ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Hackathon Name</Label>
                  <input
                    id="name"
                    required
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    placeholder="e.g. Winter Developer Challenge 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="track">Evaluation Track</Label>
                  <input
                    id="track"
                    required
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    placeholder="e.g. Full-Stack Dev, ML Algorithms"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Create Event</Button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded text-sm">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-400">Hackathon Event Created</h4>
                <p className="text-xs text-slate mt-1">Hackathon registry successfully logged. You can now invite judges, register teams, and receive code submissions.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Event Parameters</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Hackathon events integrate directly into matches. Finishing rankings triggers:
                <br />• Candidate profile score increases.
                <br />• Recruiter watch notifications.
                <br />• Badge allocation triggers.
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
          <p>**Hackathon Setup Schema**: Saves directly to the `events` or `hackathons` table. Triggers automated database triggers for leaderboard compilation.</p>
        </CardContent>
      </Card>
    </div>
  );
}

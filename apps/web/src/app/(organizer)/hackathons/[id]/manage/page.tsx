"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  fetchHackathon,
  fetchHackathonTeams,
  importHackathonTeamsCsv,
  type HackathonResponse,
  type TeamResponse,
} from "@/lib/api";

export default function OrganizerManageHackathonPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [hackathon, setHackathon] = useState<HackathonResponse | null>(null);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [track, setTrack] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [judgeScore, setJudgeScore] = useState("");
  const [members, setMembers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const [h, t] = await Promise.all([
      fetchHackathon(token, params.id),
      fetchHackathonTeams(token, params.id),
    ]);
    setHackathon(h);
    setTeams(t);
    setLoading(false);
  }, [getToken, params.id]);

  useEffect(() => {
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load hackathon");
      setLoading(false);
    });
  }, [load]);

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      await importHackathonTeamsCsv(token, params.id, [
        {
          team_name: teamName,
          track: track || null,
          repo_url: repoUrl || null,
          judge_score: judgeScore ? Number(judgeScore) : null,
          members: members
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean)
            .map((github_username) => ({ github_username })),
        },
      ]);
      setTeamName("");
      setTrack("");
      setRepoUrl("");
      setJudgeScore("");
      setMembers("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add team");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading hackathon…</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Manage Hackathon Event</h1>
        <p className="text-sm text-slate">{hackathon?.name} — organizer manual roster entry (FR-7a).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Registered Teams</CardTitle>
            <CardDescription>{teams.length} team(s) registered so far.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teams.length === 0 && <p className="text-sm text-slate">No teams yet — add one below.</p>}
            {teams.map((t) => (
              <div key={t.id} className="p-3 border rounded bg-slate-50 dark:bg-zinc-900 flex justify-between items-center">
                <div>
                  <p className="font-medium text-ink dark:text-zinc-50">{t.team_name}</p>
                  {t.track && <p className="text-xs text-slate mt-0.5">Track: {t.track}</p>}
                </div>
                <Badge>Registered</Badge>
              </div>
            ))}

            <form onSubmit={handleAddTeam} className="space-y-3 pt-4 border-t mt-4">
              <h4 className="font-semibold text-sm text-ink dark:text-zinc-50">Add a Team</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="teamName">Team Name</Label>
                  <input
                    id="teamName"
                    required
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="teamTrack">Track</Label>
                  <input
                    id="teamTrack"
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="repoUrl">Repo URL (optional)</Label>
                <input
                  id="repoUrl"
                  className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                  placeholder="https://github.com/org/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="judgeScore">Judge Score (optional)</Label>
                  <input
                    id="judgeScore"
                    type="number"
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    value={judgeScore}
                    onChange={(e) => setJudgeScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="members">Member GitHub usernames (comma separated)</Label>
                  <input
                    id="members"
                    className="w-full px-3 py-2 border rounded text-sm bg-background text-foreground"
                    placeholder="octocat, defunkt"
                    value={members}
                    onChange={(e) => setMembers(e.target.value)}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-rose-flagged">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add Team"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Event Parameters</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Manual roster entry reuses the same CSV-import path organizers would use for a
                bulk file (FR-7a) — one row at a time here, same backend endpoint.</p>
              <p>Teams can also self-register their own repo/deck link directly (FR-7c) once
                candidates log in.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

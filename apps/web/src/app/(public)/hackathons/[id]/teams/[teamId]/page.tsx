"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPublicHackathonTeamDetail, type TeamDetailResponse } from "@/lib/api";

export default function PublicTeamPage() {
  const params = useParams<{ id: string; teamId: string }>();
  const [detail, setDetail] = useState<TeamDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setDetail(await fetchPublicHackathonTeamDetail(params.id, params.teamId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, params.teamId]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-8">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-ink">
          Team: {detail?.team.team_name ?? params.teamId}
        </h1>
        <p className="text-sm text-slate">Hackathon: {params.id}</p>
      </div>

      {loading && <p className="text-sm text-slate">Loading…</p>}
      {error && <p className="text-sm text-rose-flagged">{error}</p>}

      {detail && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 space-y-4">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Team Specifications</CardTitle>
              <CardDescription>Details about participants, code repository links, and pitch deck status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-ink dark:text-zinc-50">GitHub Repository</span>
                {detail.submission?.repo_url ? (
                  <a href={detail.submission.repo_url} className="text-blue-600 hover:underline">
                    {detail.submission.repo_url}
                  </a>
                ) : (
                  <span>Not linked</span>
                )}
              </div>
              {detail.ranking && (
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-ink dark:text-zinc-50">Composite Score</span>
                  <span>#{detail.ranking.rank} — {detail.ranking.composite_score.toFixed(1)} pts</span>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-semibold text-ink dark:text-zinc-50">Team Members</h4>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {detail.members.map((m) => (
                    <li key={m.id}>{m.display_name ?? m.github_username ?? "Unregistered member"} ({m.role})</li>
                  ))}
                  {detail.members.length === 0 && <li>No members registered</li>}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Public Page Info</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
                <p>Publicly accessible, no sign-in required — candidates, judges, recruiters, and the general public all see the same team detail.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

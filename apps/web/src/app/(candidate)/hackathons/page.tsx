"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOpenHackathons, type HackathonResponse } from "@/lib/api";
import { CardListSkeleton } from "@/components/CardListSkeleton";

// QA finding (Track 2): candidates had no way to discover a hackathon to submit a
// project to — `submitHackathonProject()` existed in lib/api.ts but no page called it,
// and the only listing endpoint (`GET /hackathons`) is organizer-only and 403s a
// candidate token. Fixed by adding a new, additive, candidate-role `GET /hackathons/open`
// endpoint (services/api/routers/hackathons.py) rather than touching the existing
// organizer-scoped `GET /hackathons` — see .agents/decisions.md for the full rationale.
export default function CandidateHackathonsPage() {
  const { getToken } = useAuth();
  const [hackathons, setHackathons] = useState<HackathonResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchOpenHackathons(token);
        if (!cancelled) setHackathons(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load hackathons");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Hackathons</h1>
        <p className="text-sm text-slate">
          Join an open hackathon and submit your team&apos;s project — recruiters watch top-ranked teams for hiring.
        </p>
      </div>

      {error && <p className="text-sm text-rose-flagged">{error}</p>}
      {!error && hackathons === null && <CardListSkeleton />}
      {hackathons !== null && hackathons.length === 0 && (
        <p className="text-sm text-slate">No open hackathons right now — check back later.</p>
      )}

      <div className="space-y-4">
        {hackathons?.map((hackathon) => (
          <Card key={hackathon.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold">{hackathon.name}</CardTitle>
                  <CardDescription>
                    {hackathon.start_date && hackathon.end_date
                      ? `${new Date(hackathon.start_date).toLocaleDateString()} – ${new Date(hackathon.end_date).toLocaleDateString()}`
                      : "Dates to be announced"}
                  </CardDescription>
                </div>
                <Button size="sm" render={<Link href={`/hackathons/${hackathon.id}/join`} />}>
                  Submit Project
                </Button>
              </div>
            </CardHeader>
            {hackathon.tracks && hackathon.tracks.length > 0 && (
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {hackathon.tracks.map((track) => (
                    <Badge key={track} variant="outline">{track}</Badge>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

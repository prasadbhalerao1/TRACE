"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJobMatches, type MatchScoreWithCandidateResponse } from "@/lib/api";

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value === null ? "—" : `${value.toFixed(0)}/100`}</span>
    </div>
  );
}

export default function RecruiterMatchesPage() {
  const params = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [matches, setMatches] = useState<MatchScoreWithCandidateResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");
        const result = await fetchJobMatches(token, params.id);
        if (!cancelled) setMatches(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load matches");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, params.id]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ranked Candidate Matches</h1>
          <p className="text-sm text-slate">Review AI-matched and ranked candidates with the full 4-term score breakdown.</p>
        </div>
        <Button render={<Link href={`/pipeline/${params.id}`} />} variant="outline">
          View Pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Matched Candidates</CardTitle>
            <CardDescription>SkillOverlap + SemanticSimilarity + ExperienceMatch + TalentScoreAlignment (doc 08 §2).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-rose-flagged">{error}</p>}
            {!error && matches === null && <p className="text-sm text-slate">Loading matches…</p>}
            {matches !== null && matches.length === 0 && (
              <p className="text-sm text-slate">No candidates in the pool yet — matches will populate as candidates onboard.</p>
            )}
            {matches?.map((match) => (
              <Card key={match.id} className="hover:border-primary transition-all">
                <CardHeader className="flex flex-row justify-between items-start gap-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {match.candidate_headline ?? match.candidate_github_username ?? "Candidate"}
                    </CardTitle>
                    {match.candidate_location && (
                      <Badge variant="outline" className="text-xs mt-2">{match.candidate_location}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Match %</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-lg">
                      {match.match_percentage?.toFixed(0) ?? "—"}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate">
                  <p>{match.explanation}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t pt-2">
                    <ScoreRow label="Skill Overlap" value={match.skill_similarity} />
                    <ScoreRow label="Semantic Similarity" value={match.semantic_similarity} />
                    <ScoreRow label="Experience Match" value={match.experience_match} />
                    <ScoreRow label="Talent Score Alignment" value={match.talent_score_alignment} />
                    <ScoreRow label="Project Relevance" value={match.project_relevance} />
                    <ScoreRow label="Overall Talent Score" value={match.candidate_overall_talent_score} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Ranking Rubric</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate space-y-2 leading-relaxed">
              <p>Scores combine skill overlap (verified GitHub/badge signals weighted over self-declared resume text), embedding semantic similarity, experience fit, and the candidate&apos;s own Talent Score.</p>
              <p>Never shown as a bare percentage alone — the full breakdown is always visible.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

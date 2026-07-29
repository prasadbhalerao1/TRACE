"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RecruiterMatchesPage() {
  const mockMatches = [
    { id: "1", name: "Alice Johnson", overallScore: 94.2, matchScore: 97.1, skills: ["Python", "FastAPI", "React"], rationale: "Strong alignment with FastAPI. Alice has built 3 complex hackathon projects and shows technical consistency." },
    { id: "2", name: "Bob Smith", overallScore: 88.5, matchScore: 89.6, skills: ["Python", "Django", "PostgreSQL"], rationale: "Good backend experience. Lacks FastAPI directly but has worked on similar microservice infrastructures." }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Ranked Candidate Matches</h1>
        <p className="text-sm text-slate">Review AI-matched and ranked candidates with overall score breakdowns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Matched Candidates</CardTitle>
            <CardDescription>Top ranked matches from Qdrant vector semantic search and Claude re-ranking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockMatches.map((match) => (
              <Card key={match.id} className="hover:border-primary transition-all">
                <CardHeader className="flex flex-row justify-between items-start gap-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">{match.name}</CardTitle>
                    <div className="flex gap-1.5 flex-wrap pt-2">
                      {match.skills.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Match Match</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-lg">{match.matchScore}%</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate">
                  <p>{match.rationale}</p>
                  <p className="text-xs text-muted-foreground pt-1">Overall Talent Score: {match.overallScore}/100</p>
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
              <p>Top candidate recommendations are generated in real-time by a backend agent chain running on Claude 3.5 Sonnet.</p>
              <p>Scores are calculated combining semantic skill distance (Qdrant), verified credentials (badges), and past coding complexity.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Technical Reference: doc/SRS/02-SRS-AI-Recruitment-Platform.md</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate space-y-2">
          <p>**Re-ranking Endpoint**: Calls `GET /jobs/[id]/matches`. The payload combines DB models and embeds Qdrant vector distances for re-ranking scores.</p>
        </CardContent>
      </Card>
    </div>
  );
}

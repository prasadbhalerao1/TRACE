// FR-5.2 — public candidate portfolio. Per doc/multi-agent-architecture/00 §2.1, this is
// one of only TWO pages in the whole app that use Server-Side Rendering (the other is
// the hackathon leaderboard) — everywhere else in this app is a Client Component that
// fetches from FastAPI in the browser. This page is the exception because it must be
// public, unauthenticated, and crawlable/SEO-friendly (NFR: Lighthouse SEO >= 90),
// which means the HTML has to already contain the content on first response.
//
// No "use client" here — this is a Server Component. It fetches directly from FastAPI
// at request time (no caching: `cache: "no-store"` inside fetchPublicPortfolio) using
// the server-only BACKEND_URL env var, never NEXT_PUBLIC_API_URL — this fetch must
// never ship to or run in the browser bundle. Per doc 00 §2.1's hard boundary, Next.js
// still never touches the database directly; it only talks to FastAPI over HTTP.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPublicPortfolio } from "@/lib/api";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const portfolio = await fetchPublicPortfolio(BACKEND_URL, username);
  if (!portfolio) {
    return { title: "Profile not found" };
  }
  const title = portfolio.headline ? `${portfolio.username} — ${portfolio.headline}` : portfolio.username;
  return {
    title,
    description:
      portfolio.headline ??
      `${portfolio.username}'s verified talent profile, projects, and badges.`,
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { username } = await params;
  const portfolio = await fetchPublicPortfolio(BACKEND_URL, username);

  if (!portfolio) {
    notFound();
  }

  const { headline, location, skills, experience, education, projects, badges, overall_score } =
    portfolio;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-semibold text-ink">{portfolio.username}</h1>
        {headline && <p className="text-lg text-slate">{headline}</p>}
        <p className="text-sm text-muted-foreground">
          {[location, overall_score !== null ? `Talent Score ${overall_score.toFixed(1)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {skills && skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <Badge key={i} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Verified badges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge
                key={badge.id}
                variant="secondary"
                className="border-teal-verified/40 text-teal-verified"
                title={badge.corroboration_sources.join(", ")}
              >
                {badge.skill_name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => (
              <div key={project.repo_full_name} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{project.repo_full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    project.stars !== null ? `${project.stars} stars` : null,
                    project.languages ? Object.keys(project.languages).join(", ") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {experience && experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {experience.map((entry, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">
                  {String(entry.title ?? "")}
                  {entry.company ? ` — ${String(entry.company)}` : ""}
                </p>
                {entry.description ? (
                  <p className="text-muted-foreground">{String(entry.description)}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {education && education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {education.map((entry, i) => (
              <p key={i} className="text-sm">
                {String(entry.institution ?? "")} {entry.degree ? `— ${String(entry.degree)}` : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

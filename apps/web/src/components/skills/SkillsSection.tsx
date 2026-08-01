"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { GithubProjectSummary } from "@/lib/api";

// Static keyword -> category map. Matched against repo topics (explicit, candidate-set
// GitHub tags) and languages (byte-count aggregated). Deliberately conservative: only
// categorizes signals we actually have data for — no package.json/framework parsing,
// since the ingestion pipeline doesn't fetch repo file contents.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Frontend: ["react", "reactjs", "nextjs", "next-js", "vue", "vuejs", "angular", "svelte", "tailwindcss", "html", "css"],
  Backend: ["nodejs", "node", "express", "expressjs", "fastapi", "django", "flask", "spring", "springboot", "graphql", "rest-api"],
  Languages: ["typescript", "javascript", "python", "java", "c++", "c", "go", "golang", "rust", "ruby", "php", "kotlin", "swift", "c#"],
  Databases: ["mongodb", "postgresql", "postgres", "mysql", "sqlite", "redis", "firebase", "supabase", "prisma"],
  DevOps: ["docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci-cd", "github-actions", "devops"],
};

function categorize(projects: GithubProjectSummary[]): Record<string, Set<string>> {
  const categories: Record<string, Set<string>> = { Frontend: new Set(), Backend: new Set(), Languages: new Set(), Databases: new Set(), DevOps: new Set() };

  const signals = new Set<string>();
  for (const project of projects) {
    for (const topic of project.topics ?? []) signals.add(topic.toLowerCase());
    for (const lang of Object.keys(project.languages ?? {})) signals.add(lang.toLowerCase());
  }

  for (const signal of signals) {
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.includes(signal)) categories[category].add(signal);
    }
  }

  return categories;
}

export function SkillsSection({ projects }: { projects: GithubProjectSummary[] }) {
  const categories = useMemo(() => categorize(projects), [projects]);
  const hasAny = Object.values(categories).some((set) => set.size > 0);

  if (!hasAny) {
    return <EmptyState message="Skills are inferred from repository topics and languages — add topics to your GitHub repos to populate this section." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Object.entries(categories)
        .filter(([, set]) => set.size > 0)
        .map(([category, set]) => (
          <div key={category} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/40 hover:border-zinc-300/80 transition-colors dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:border-zinc-600/80">
            <p className="mb-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">{category}</p>
            <div className="flex flex-wrap gap-2">
              {[...set].map((skill) => (
                <Badge key={skill} variant="secondary" className="border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 transition-all text-xs font-semibold px-2.5 py-1 capitalize dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

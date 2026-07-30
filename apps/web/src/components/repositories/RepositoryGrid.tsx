"use client";

import { useMemo } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { RepositoryCard } from "@/components/repositories/RepositoryCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GithubProjectSummary } from "@/lib/api";

export function RepositoryGrid({ projects }: { projects: GithubProjectSummary[] }) {
  const mostStarred = useMemo(() => [...projects].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)), [projects]);
  const recentlyUpdated = useMemo(
    () =>
      [...projects].sort((a, b) => {
        if (!a.pushed_at) return 1;
        if (!b.pushed_at) return -1;
        return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
      }),
    [projects],
  );

  if (projects.length === 0) {
    return <EmptyState message="No repositories synced yet." />;
  }

  return (
    <Tabs defaultValue="starred" className="w-full">
      <TabsList className="bg-zinc-100 border border-zinc-200/80 p-1 rounded-lg h-9">
        <TabsTrigger value="starred" className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-500 data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm rounded-md px-3">Most Starred</TabsTrigger>
        <TabsTrigger value="recent" className="text-[10px] font-bold uppercase tracking-wider font-mono text-zinc-500 data-[state=active]:bg-white data-[state=active]:text-zinc-800 data-[state=active]:shadow-sm rounded-md px-3">Recently Updated</TabsTrigger>
      </TabsList>
      <TabsContent value="starred" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 focus-visible:outline-none">
        {mostStarred.slice(0, 8).map((project, i) => (
          <RepositoryCard key={project.repo_full_name} project={project} index={i} />
        ))}
      </TabsContent>
      <TabsContent value="recent" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 focus-visible:outline-none">
        {recentlyUpdated.slice(0, 8).map((project, i) => (
          <RepositoryCard key={project.repo_full_name} project={project} index={i} />
        ))}
      </TabsContent>
    </Tabs>
  );
}

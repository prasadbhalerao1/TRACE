import { useMemo } from "react";
import { motion } from "framer-motion";

import { EmptyState } from "@/components/common/EmptyState";
import type { GithubProjectSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

const LANGUAGE_COLORS = ["bg-emerald-500", "bg-sky-500", "bg-orange-500", "bg-rose-500", "bg-violet-500", "bg-amber-500"];

function useLanguageBreakdown(projects: GithubProjectSummary[]) {
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const project of projects) {
      if (!project.languages) continue;
      for (const [lang, bytes] of Object.entries(project.languages)) {
        totals.set(lang, (totals.get(lang) ?? 0) + (typeof bytes === "number" ? bytes : 0));
      }
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, bytes], i) => ({
        name,
        percent: sum > 0 ? Math.round((bytes / sum) * 1000) / 10 : 0,
        color: LANGUAGE_COLORS[i % LANGUAGE_COLORS.length],
      }));
  }, [projects]);
}

export function LanguageChart({ projects }: { projects: GithubProjectSummary[] }) {
  const languages = useLanguageBreakdown(projects);

  if (languages.length === 0) {
    return <EmptyState message="No language data yet." />;
  }

  return (
    <div className="space-y-5">
      {/* Horizontal Stacked Bar */}
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-zinc-100 p-[2px] border border-zinc-200/80">
        {languages.map((lang) => (
          <motion.div
            key={lang.name}
            initial={{ width: 0 }}
            animate={{ width: `${lang.percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", lang.color)}
            title={`${lang.name}: ${lang.percent}%`}
          />
        ))}
      </div>

      {/* Language Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3">
        {languages.map((lang, idx) => (
          <motion.div
            key={lang.name}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
            className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50/50 border border-zinc-200/60 hover:border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", lang.color)} />
              <span className="font-semibold text-zinc-700 text-xs">{lang.name}</span>
            </div>
            <span className="font-mono text-xs text-zinc-400 font-medium">{lang.percent}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

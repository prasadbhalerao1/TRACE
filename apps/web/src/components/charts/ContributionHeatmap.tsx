"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface ContributionHeatmapProps {
  /** date (YYYY-MM-DD) -> contribution/submission count */
  days: { date: string; count: number }[];
}

const LEVEL_CLASSNAMES = [
  "bg-zinc-100 border border-zinc-200/40 dark:bg-zinc-700 dark:border-zinc-600/40",
  "bg-emerald-100/80 border border-emerald-200/20 dark:bg-emerald-900/60 dark:border-emerald-800/20",
  "bg-emerald-300/80 border border-emerald-450/20 dark:bg-emerald-700/80 dark:border-emerald-600/20",
  "bg-emerald-500 border border-emerald-550/20 dark:bg-emerald-600 dark:border-emerald-500/20",
  "bg-emerald-600 border border-emerald-700/20 dark:bg-emerald-500 dark:border-emerald-400/20"
];

function levelFor(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/** GitHub/LeetCode-style contribution heatmap — 7-row week grid, most recent ~53 weeks. */
export function ContributionHeatmap({ days }: ContributionHeatmapProps) {
  const { weeks, max, monthLabels } = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d.count]));
    const sorted = [...byDate.keys()].sort();
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 370);
    // Align the grid to start on a Sunday so weeks stack into clean columns.
    start.setDate(start.getDate() - start.getDay());

    const allDays: { date: string; count: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const iso = cursor.toISOString().slice(0, 10);
      allDays.push({ date: iso, count: byDate.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeksArr: { date: string; count: number }[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeksArr.push(allDays.slice(i, i + 7));
    }

    const maxCount = Math.max(1, ...sorted.map((d) => byDate.get(d) ?? 0));

    const labels: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, i) => {
      const firstOfMonth = week.find((d) => Number(d.date.slice(8, 10)) <= 7);
      if (firstOfMonth) {
        const month = new Date(firstOfMonth.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ weekIndex: i, label: new Date(firstOfMonth.date).toLocaleString("default", { month: "short" }) });
          lastMonth = month;
        }
      }
    });

    return { weeks: weeksArr, max: maxCount, monthLabels: labels };
  }, [days]);

  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      <div className="relative mb-2 h-4 select-none" style={{ width: weeks.length * 14 }}>
        {monthLabels.map(({ weekIndex, label }) => (
          <span key={weekIndex} className="absolute text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono" style={{ left: weekIndex * 14 }}>
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-[3px]" style={{ width: weeks.length * 14 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15, delay: (wi * 7 + di) * 0.0008 }}
                title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                className={`h-[11px] w-[11px] rounded-[2px] ${LEVEL_CLASSNAMES[levelFor(day.count, max)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono select-none">
        <span>Less</span>
        {LEVEL_CLASSNAMES.map((cls, idx) => (
          <div key={idx} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

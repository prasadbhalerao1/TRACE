"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/common/EmptyState";

interface TooltipPayload {
  value: number;
  payload: {
    week: number;
    commits: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Week {payload[0].payload.week}</p>
        <p className="mt-0.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{payload[0].value} Commits</p>
      </div>
    );
  }
  return null;
};

export interface CommitActivityChartProps {
  weeklyCounts: number[] | undefined;
}

export function CommitActivityChart({ weeklyCounts }: CommitActivityChartProps) {
  const data = useMemo(() => (weeklyCounts ?? []).map((count, i) => ({ week: i + 1, commits: count })), [weeklyCounts]);

  if (data.length === 0) {
    return <EmptyState message="Commit activity will appear here once GitHub data has synced." />;
  }

  // Detect dark mode based on computed styles
  const isDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div className="h-48 w-full select-none pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" tick={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: isDark ? "#71717a" : "#a1a1aa", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }} />
          <Bar dataKey="commits" fill="url(#commitGradient)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      <div className="rounded-lg border border-border bg-card p-2.5 shadow-lg">
        <p className="text-meta font-medium text-muted-foreground">
          Week {payload[0].payload.week}
        </p>
        <p className="mt-0.5 text-xs font-extrabold text-success font-mono">
          {payload[0].value} Commits
        </p>
      </div>
    );
  }
  return null;
};

export interface CommitActivityChartProps {
  weeklyCounts: number[] | undefined;
}

export function CommitActivityChart({
  weeklyCounts,
}: CommitActivityChartProps) {
  const data = useMemo(
    () =>
      (weeklyCounts ?? []).map((count, i) => ({ week: i + 1, commits: count })),
    [weeklyCounts],
  );

  if (data.length === 0) {
    return (
      <EmptyState
        title="No commit activity yet"
        description="Activity appears here once your GitHub data has finished syncing."
      />
    );
  }

  // Detect dark mode based on computed styles
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div className="h-48 w-full select-none pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.7} />
              <stop
                offset="100%"
                stopColor="var(--success)"
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" tick={false} axisLine={false} />
          <YAxis
            tick={{
              fontSize: 10,
              fill: isDark
                ? "var(--muted-foreground)"
                : "var(--muted-foreground)",
              fontFamily: "monospace",
            }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{
              fill: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
            }}
          />
          <Bar
            dataKey="commits"
            fill="url(#commitGradient)"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

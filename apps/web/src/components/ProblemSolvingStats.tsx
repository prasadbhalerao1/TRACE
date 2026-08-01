"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ContributionHeatmap } from "@/components/charts/ContributionHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeetcodeStats } from "@/lib/api";

interface ProblemSolvingStatsProps {
  leetcodeUsername: string | null;
  leetcodeStats: LeetcodeStats | null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.25 } }),
};

function StatCard({ label, value, index }: { label: string; value: string | number; index: number }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="show" custom={index} whileHover={{ y: -2 }}>
      <Card className="border-zinc-200 bg-zinc-50/50 text-zinc-900 shadow-sm transition-all duration-300 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-50 dark:hover:border-zinc-600">
        <CardContent className="p-4 space-y-1">
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="font-heading text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#10b981",
  Medium: "#f59e0b",
  Hard: "#f43f5e",
};

interface RatingPayload {
  value: number;
  payload: {
    contest: string;
    rating: number;
  };
}

interface CustomLineTooltipProps {
  active?: boolean;
  payload?: RatingPayload[];
}

const CustomLineTooltip = ({ active, payload }: CustomLineTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate max-w-[150px]">{payload[0].payload.contest}</p>
        <p className="mt-0.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">Rating: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export function ProblemSolvingStats({ leetcodeUsername, leetcodeStats }: ProblemSolvingStatsProps) {
  const calendarDays = useMemo(() => {
    if (!leetcodeStats) return [];
    return Object.entries(leetcodeStats.submission_calendar).map(([unixSeconds, count]) => ({
      date: new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 10),
      count,
    }));
  }, [leetcodeStats]);

  const difficultyData = useMemo(() => {
    if (!leetcodeStats) return [];
    return [
      { name: "Easy", value: leetcodeStats.easy_solved },
      { name: "Medium", value: leetcodeStats.medium_solved },
      { name: "Hard", value: leetcodeStats.hard_solved },
    ];
  }, [leetcodeStats]);

  const ratingData = useMemo(() => {
    if (!leetcodeStats) return [];
    return leetcodeStats.contest_history.map((point) => ({
      contest: point.title,
      rating: Math.round(point.rating),
    }));
  }, [leetcodeStats]);

  if (!leetcodeUsername) {
    return (
      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-zinc-950/40">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">Problem Solving Stats</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Connect LeetCode to show your problem-solving activity here.</p>
        </CardContent>
      </Card>
    );
  }

  if (!leetcodeStats) {
    return (
      <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-500 uppercase">Problem Solving Stats</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-zinc-500">Stats haven&apos;t synced yet — try refreshing.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-200 bg-white text-zinc-900 shadow-md shadow-zinc-200/40">
      <CardHeader className="pb-3 border-b border-zinc-100 mb-4 flex-row items-center justify-between">
        <div>
          <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-500 uppercase">Problem Solving Stats</CardTitle>
          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">@{leetcodeUsername} on LeetCode</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Questions Solved" value={leetcodeStats.total_solved} index={0} />
          <StatCard label="Active Days" value={leetcodeStats.total_active_days} index={1} />
          <StatCard label="Current Streak" value={leetcodeStats.current_streak} index={2} />
          <StatCard
            label="Global Rank"
            value={leetcodeStats.ranking !== null ? leetcodeStats.ranking.toLocaleString("en-US") : "—"}
            index={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/30 dark:border-zinc-700 dark:bg-zinc-800/30">
            <p className="mb-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Question Distribution</p>
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={difficultyData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} stroke="none">
                    {difficultyData.map((entry) => (
                      <Cell key={entry.name} fill={DIFFICULTY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {ratingData.length > 1 && (
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/30 dark:border-zinc-700 dark:bg-zinc-800/30">
              <p className="mb-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">Contest Rating</p>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="contest" tick={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "monospace" }} tickLine={false} axisLine={false} domain={["dataMin - 50", "dataMax + 50"]} />
                    <Tooltip content={<CustomLineTooltip />} />
                    <Line type="monotone" dataKey="rating" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {calendarDays.length > 0 && (
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/30 dark:border-zinc-700 dark:bg-zinc-800/30">
            <p className="mb-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Submission Activity</p>
            <ContributionHeatmap days={calendarDays} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

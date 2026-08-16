"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { SUB_SCORE_LABELS, type SubScore } from "@/lib/api";

export function ScoreRadarChart({
  subScores,
}: {
  subScores: Record<string, SubScore>;
}) {
  const data = Object.entries(SUB_SCORE_LABELS).map(([key, label]) => ({
    subject: label,
    value: subScores[key]?.value ?? 0,
    hasData:
      subScores[key]?.value !== null && subScores[key]?.value !== undefined,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 10, fill: "var(--foreground)", fontWeight: 500 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
          />
          <Radar
            name="Talent Score"
            dataKey="value"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.15}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

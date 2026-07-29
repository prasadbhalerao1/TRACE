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

export function ScoreRadarChart({ subScores }: { subScores: Record<string, SubScore> }) {
  const data = Object.entries(SUB_SCORE_LABELS).map(([key, label]) => ({
    subject: label,
    value: subScores[key]?.value ?? 0,
    hasData: subScores[key]?.value !== null && subScores[key]?.value !== undefined,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar
            name="Talent Score"
            dataKey="value"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

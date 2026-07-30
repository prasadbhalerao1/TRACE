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
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#3f3f46", fontWeight: 500 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#71717a" }} axisLine={false} />
          <Radar
            name="Talent Score"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.15}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

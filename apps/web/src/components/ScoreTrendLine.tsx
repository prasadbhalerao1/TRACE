"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TalentScoreResponse } from "@/lib/api";

export function ScoreTrendLine({ history }: { history: TalentScoreResponse[] }) {
  const data = history.map((s) => ({
    date: new Date(s.computed_at).toLocaleDateString(),
    overall: s.overall,
  }));

  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Score history will appear here once your Talent Score has been recomputed a few times.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="overall" stroke="var(--color-primary)" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

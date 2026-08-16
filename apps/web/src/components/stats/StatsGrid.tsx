"use client";

import {
  CalendarDays,
  Flame,
  FolderGit2,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

import { StatCard } from "@/components/stats/StatCard";
import type { GithubStats } from "@/lib/api";

export function StatsGrid({ stats }: { stats: GithubStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      <StatCard
        label="Contributions"
        value={stats.total_contributions}
        icon={Zap}
      />
      <StatCard
        label="Active Days"
        value={stats.active_days}
        icon={CalendarDays}
      />
      <StatCard
        label="Current Streak"
        value={stats.current_streak}
        icon={Flame}
        iconClassName="text-warning"
      />
      <StatCard
        label="Max Streak"
        value={stats.longest_streak}
        icon={Trophy}
        iconClassName="text-warning"
      />
      <StatCard label="Followers" value={stats.followers} icon={Users} />
      <StatCard label="Following" value={stats.following} icon={UserCheck} />
      <StatCard
        label="Public Repos"
        value={stats.public_repos}
        icon={FolderGit2}
      />
    </div>
  );
}

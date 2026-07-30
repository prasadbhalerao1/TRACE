import { CalendarDays, Flame, FolderGit2, Trophy, UserCheck, Users, Zap } from "lucide-react";

import { StatCard } from "@/components/stats/StatCard";
import type { GithubStats } from "@/lib/api";

export function StatsGrid({ stats }: { stats: GithubStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      <StatCard label="Contributions" value={stats.total_contributions} icon={Zap} index={0} />
      <StatCard label="Active Days" value={stats.active_days} icon={CalendarDays} index={1} />
      <StatCard label="Current Streak" value={stats.current_streak} icon={Flame} iconClassName="text-orange-400" index={2} />
      <StatCard label="Max Streak" value={stats.longest_streak} icon={Trophy} iconClassName="text-amber-400" index={3} />
      <StatCard label="Followers" value={stats.followers} icon={Users} index={4} />
      <StatCard label="Following" value={stats.following} icon={UserCheck} index={5} />
      <StatCard label="Public Repos" value={stats.public_repos} icon={FolderGit2} index={6} />
    </div>
  );
}

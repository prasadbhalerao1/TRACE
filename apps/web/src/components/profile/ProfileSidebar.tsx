import { useUser } from "@clerk/nextjs";
import { Braces, Building2, Code2, GraduationCap, Link2, Mail, MapPin, Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CandidateProfileResponse } from "@/lib/api";

interface ProfileSidebarProps {
  profile: CandidateProfileResponse;
  onTogglePublic: (published: boolean) => void | Promise<void>;
  onClaimUsername: (username: string) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  refreshBusy: boolean;
  refreshCooldownUntil: Date | null;
}

function useCountdown(target: Date | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return useMemo(() => {
    if (!target) return null;
    const ms = target.getTime() - now;
    if (ms <= 0) return null;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }, [target, now]);
}

export function ProfileSidebar({
  profile,
  onTogglePublic,
  onClaimUsername,
  onRefresh,
  refreshBusy,
  refreshCooldownUntil,
}: ProfileSidebarProps) {
  const { user } = useUser();
  const countdown = useCountdown(refreshCooldownUntil);
  const education = profile.education?.[0] as { institution?: string; degree?: string } | undefined;
  const [usernameInput, setUsernameInput] = useState("");
  const github = profile.github_stats;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      <Card className="border-zinc-200/80 bg-white text-zinc-900 shadow-md shadow-zinc-200/40 hover:border-zinc-300 transition-colors">
        <CardContent className="space-y-6 p-6">
          {/* Avatar and Edit Badge */}
          <div className="relative mx-auto h-28 w-28 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="relative h-28 w-28 rounded-full ring-2 ring-indigo-500/10 group-hover:ring-indigo-500/30 transition-all duration-300 overflow-hidden"
            >
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.fullName ?? "avatar"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-3xl font-semibold text-zinc-600">
                  {(user?.fullName ?? profile.username ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </motion.div>
            <Link
              href="/profile/edit"
              className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition shadow-md"
              title="Edit Profile"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* User Name & Bio */}
          <div className="text-center space-y-1">
            <h2 className="font-heading text-lg font-bold text-zinc-800 leading-snug">
              {profile.full_name ?? user?.fullName ?? "Candidate"}
            </h2>
            {profile.username && (
              <p className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
                @{profile.username}
              </p>
            )}
            {github?.bio && (
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed font-sans max-w-[220px] mx-auto">
                {github.bio}
              </p>
            )}
          </div>

          {/* Social Stats */}
          {(github?.followers !== undefined || github?.following !== undefined) && (
            <div className="flex items-center justify-center gap-6 border-y border-zinc-100 py-3 text-xs text-zinc-500">
              <div>
                <span className="font-bold text-zinc-800">{github?.followers ?? 0}</span> followers
              </div>
              <div className="h-3 w-px bg-zinc-200" />
              <div>
                <span className="font-bold text-zinc-800">{github?.following ?? 0}</span> following
              </div>
            </div>
          )}

          {/* Social Links */}
          <div className="flex items-center justify-center gap-4">
            {user?.primaryEmailAddress && (
              <motion.a
                whileHover={{ y: -2 }}
                href={`mailto:${user.primaryEmailAddress.emailAddress}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition"
                title="Email"
              >
                <Mail className="h-4 w-4" />
              </motion.a>
            )}
            {profile.github_username && (
              <motion.a
                whileHover={{ y: -2 }}
                href={`https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition"
                title={`@${profile.github_username} on GitHub`}
              >
                <Code2 className="h-4 w-4" />
              </motion.a>
            )}
            {profile.leetcode_username && (
              <motion.a
                whileHover={{ y: -2 }}
                href={`https://leetcode.com/${profile.leetcode_username}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition"
                title={`@${profile.leetcode_username} on LeetCode`}
              >
                <Braces className="h-4 w-4" />
              </motion.a>
            )}
            {github?.website_url && (
              <motion.a
                whileHover={{ y: -2 }}
                href={github.website_url}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition"
                title={github.website_url}
              >
                <Link2 className="h-4 w-4" />
              </motion.a>
            )}
          </div>

          {/* Location / Org / School */}
          <div className="space-y-3 pt-2 text-xs text-zinc-500 min-w-0 w-full">
            {profile.location && (
              <div className="flex items-center gap-3 min-w-0 w-full">
                <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="text-zinc-700 font-medium truncate flex-1" title={profile.location}>{profile.location}</span>
              </div>
            )}
            {github?.company && (
              <div className="flex items-center gap-3 min-w-0 w-full">
                <Building2 className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="text-zinc-700 truncate flex-1" title={github.company}>{github.company}</span>
              </div>
            )}
            {education?.institution && (
              <div className="flex items-start gap-3 min-w-0 w-full">
                <GraduationCap className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
                <div className="text-zinc-700 leading-tight min-w-0 flex-1">
                  <p className="font-medium truncate" title={education.institution}>{education.institution}</p>
                  {education.degree && <p className="text-[10px] text-zinc-400 truncate mt-0.5" title={education.degree}>{education.degree}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Visibility & Refresh Operations */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            {profile.username ? (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Public Profile</span>
                <Switch checked={profile.portfolio_published} onCheckedChange={onTogglePublic} />
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Claim profile link</span>
                <div className="flex gap-2">
                  <Input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="username"
                    className="h-8 text-xs border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-indigo-500/20"
                  />
                  <Button size="sm" className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white font-medium" disabled={!usernameInput.trim()} onClick={() => onClaimUsername(usernameInput.trim())}>
                    Publish
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                {countdown ? (
                  <>
                    Next Refresh <span className="font-mono text-zinc-800 font-semibold">{countdown}</span>
                  </>
                ) : (
                  "Sync Latest Stats"
                )}
              </span>
              <button
                onClick={() => onRefresh()}
                disabled={refreshBusy || countdown !== null}
                className="rounded-md p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="Refresh stats"
              >
                <RefreshCw className={`h-4 w-4 ${refreshBusy ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

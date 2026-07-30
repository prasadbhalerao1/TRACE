"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AchievementCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  earned: boolean;
  tierClassName?: string;
  index?: number;
}

export function AchievementCard({ icon: Icon, title, description, earned, tierClassName, index = 0 }: AchievementCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: earned ? 1 : 0.45, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      whileHover={earned ? { y: -2 } : undefined}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-zinc-200 p-4 text-center transition-all duration-300",
        earned ? "bg-white hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/50" : "bg-zinc-50/50 grayscale select-none",
      )}
    >
      <div className={cn("rounded-full p-3 border shadow-sm transition-colors", earned ? tierClassName ?? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-zinc-200 bg-zinc-100 text-zinc-400")}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-zinc-800 font-heading leading-tight">{title}</p>
        <p className="text-[10px] leading-relaxed text-zinc-500 font-sans">{description}</p>
      </div>
    </motion.div>
  );
}

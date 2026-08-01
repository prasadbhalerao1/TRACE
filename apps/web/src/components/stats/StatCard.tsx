"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconClassName?: string;
  index?: number;
}

export function StatCard({ label, value, icon: Icon, iconClassName, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <Card className="h-full border-zinc-200 bg-white text-zinc-900 shadow-sm shadow-zinc-200/30 transition-all duration-300 hover:border-zinc-300 hover:bg-zinc-50/40 hover:shadow-md hover:shadow-zinc-200/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-zinc-950/30 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/40 dark:hover:shadow-lg dark:hover:shadow-zinc-950/50">
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</p>
            <p className="font-heading text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 tracking-tight">{value}</p>
          </div>
          {Icon && (
            <div className={cn("rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-500 group-hover:text-zinc-800 transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200", iconClassName)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

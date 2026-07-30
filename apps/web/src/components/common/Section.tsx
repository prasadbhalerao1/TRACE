"use client";

import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
  index?: number;
}

/** Standard "titled card" wrapper shared by every dashboard section, so each section
 * component only owns its own content, not header/animation/card boilerplate. */
export function Section({ title, subtitle, action, className, contentClassName, children, index = 0 }: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={className}
    >
      <Card className="h-full border-zinc-200/80 bg-white text-zinc-900 shadow-sm shadow-zinc-200/40">
        <CardHeader className="flex-row items-center justify-between pb-3 border-b border-zinc-100">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xs font-bold tracking-wider text-zinc-500 uppercase">{title}</CardTitle>
            {subtitle && <p className="text-[10px] text-zinc-400 font-medium">{subtitle}</p>}
          </div>
          {action}
        </CardHeader>
        <CardContent className={cn("pt-4", contentClassName)}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

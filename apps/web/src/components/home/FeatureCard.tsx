import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface Feature {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Renders a subtle "Soon" pill and disables the link. */
  comingSoon?: boolean;
}

/** One capability in the landing hub grid. The whole card is the click target —
 * a small "Open" text link inside a large card is a needlessly precise thing to
 * ask someone to hit. */
export function FeatureCard({ feature }: { feature: Feature }) {
  const { href, title, description, icon: Icon, comingSoon } = feature;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-900">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        {comingSoon && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Soon
          </span>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="font-heading text-sm font-semibold text-ink dark:text-zinc-50">{title}</h3>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </>
  );

  const shell = cn(
    "group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-5 text-left",
    "dark:border-zinc-800 dark:bg-zinc-950",
    comingSoon
      ? "opacity-60"
      : "transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:border-indigo-900 dark:hover:shadow-none",
  );

  if (comingSoon) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link href={href} className={shell}>
      {body}
    </Link>
  );
}

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { RoleCapability } from "@/components/common/workspaceNav";

/** One capability in the hub grid. The whole card is the click target — a small "Open"
 * link inside a large card is a needlessly precise thing to ask someone to hit.
 *
 * Deliberately quiet: no tinted icon tile, no lift, no coloured shadow. These are a
 * secondary catalogue below the work that actually needs attention, and a grid of
 * accented cards would out-shout it. */
export function FeatureCard({ feature }: { feature: RoleCapability }) {
  const { href, label, description, icon: Icon } = feature;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <Icon
          aria-hidden
          className="size-4 text-muted-foreground transition-colors duration-(--animate-duration-fast) group-hover:text-primary"
          strokeWidth={1.75}
        />
        
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-body font-medium text-foreground">{label}</h3>
        <p className="text-meta leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </>
  );

  const shell = cn(
    "group flex flex-col rounded-lg bg-card p-4 text-left shadow-flat",
    "outline-none transition-shadow duration-(--animate-duration-fast) hover:shadow-raised focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  return (
    <Link href={href} className={shell}>
      {body}
    </Link>
  );
}

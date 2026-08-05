"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Stepwise progress for a long-running backend pipeline.
 *
 * The pipelines this reports on (GitHub ingestion, job matching, deck analysis) take
 * minutes. A single unchanging "Analyzing…" line for that long is indistinguishable from
 * a hang — which is how it was reported. Showing the named phases makes the wait legible:
 * the user sees which step is running, which are finished, and how much is left.
 *
 * Progress is driven by `currentStage`, a real label the backend writes as each pipeline
 * node completes — not a timer. If a step genuinely stalls, this correctly keeps showing
 * that step rather than advancing a fake animation past it.
 *
 * An unrecognized `currentStage` (backend added a phase this build doesn't know) shows
 * every known step as pending and the label verbatim, rather than rendering nothing.
 */
export function StageProgress({
  stages,
  currentStage,
  className,
}: {
  /** Ordered phase labels, matching the strings the backend reports. */
  stages: readonly string[];
  /** The phase currently running, or null/undefined before the first is reported. */
  currentStage?: string | null;
  className?: string;
}) {
  const activeIndex = currentStage ? stages.indexOf(currentStage) : -1;
  // A reported-but-unknown stage still deserves to be shown to the user.
  const unknownStage = Boolean(currentStage) && activeIndex === -1;

  return (
    <div className={cn("space-y-2", className)} aria-live="polite" aria-busy="true">
      {stages.map((stage, i) => {
        const done = activeIndex > i;
        const active = activeIndex === i;
        return (
          <div key={stage} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                done && "border-teal-verified bg-teal-verified text-white",
                active && "border-teal-verified",
                !done && !active && "border-muted-foreground/30",
              )}
            >
              {done ? (
                <CheckIcon className="size-2.5" strokeWidth={3} aria-hidden />
              ) : active ? (
                // Pulsing dot marks the step actually in flight.
                <span className="size-1.5 animate-pulse rounded-full bg-teal-verified" />
              ) : null}
            </span>
            <span
              className={cn(
                "transition-colors duration-300",
                done && "text-muted-foreground line-through decoration-muted-foreground/40",
                active && "font-medium text-foreground",
                !done && !active && "text-muted-foreground/70",
              )}
            >
              {stage}
            </span>
          </div>
        );
      })}
      {unknownStage ? (
        <div className="flex items-center gap-2.5 text-sm">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-teal-verified">
            <span className="size-1.5 animate-pulse rounded-full bg-teal-verified" />
          </span>
          <span className="font-medium text-foreground">{currentStage}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Phase labels for candidate ingestion, in execution order. Must match
 * `_INGESTION_STAGE_LABELS` in `services/api/modules/candidates/router.py` — that
 * dict is the source of truth for the strings the backend reports. */
export const INGESTION_STAGES = [
  "Reading your resume",
  "Analyzing your GitHub repositories",
  "Reading your certificates",
  "Merging your profile",
  "Computing your Talent Score",
  "Awarding badges",
] as const;

"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  blurb: string;
}

/** Step rail for the onboarding wizard.
 *
 * Rendered at a fixed height whatever the step, so advancing never shifts the form
 * below it. Completed steps stay visible rather than collapsing — seeing what's done
 * and what's left is most of what makes a multi-step form feel short.
 */
export function OnboardingProgress({
  steps,
  current,
}: {
  steps: readonly WizardStep[];
  current: number;
}) {
  const pct = ((current + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Step {current + 1} of {steps.length}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {Math.round(pct)}% complete
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="flex flex-wrap gap-x-6 gap-y-2">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2 text-xs",
                active
                  ? "font-semibold text-ink dark:text-zinc-50"
                  : done
                    ? "text-zinc-500 dark:text-zinc-400"
                    : "text-zinc-400 dark:text-zinc-600",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-indigo-600 text-white"
                      : "border border-dashed border-zinc-300 dark:border-zinc-700",
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {step.title}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

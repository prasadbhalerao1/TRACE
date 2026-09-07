"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/** Background and depth layers for the landing page.
 *
 * These are decorative and sit behind content at negative z-index, so they never
 * intercept a pointer event or a screen reader. Everything animates on transform and
 * opacity only, and each effect degrades to a static state under
 * `prefers-reduced-motion`.
 */

/** Engineering grid that fades toward the edges.
 *
 * Two layered gradients rather than an SVG pattern: the mask is what keeps a grid from
 * reading as graph paper, and CSS does the fade far more cheaply than a tiled image. */
export function GridField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}

/** A card that tilts slightly toward the pointer.
 *
 * Rotation is written straight to the element's transform rather than through React
 * state, so a pointer move costs one style write instead of a re-render per frame. */
export function TiltCard({
  children,
  className,
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.transform = `perspective(1200px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
      }}
      onPointerLeave={() => {
        if (ref.current) {
          ref.current.style.transform =
            "perspective(1200px) rotateY(0deg) rotateX(0deg)";
        }
      }}
      className={cn("transition-transform duration-300 ease-out", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

/** A line of text that types itself out, then swaps to the next one.
 *
 * Used for the recruiter search demo, where watching the query being written is what
 * makes the search feel like a live product rather than a screenshot. */
export function TypingText({
  phrases,
  className,
  onPhraseChange,
}: {
  phrases: readonly string[];
  className?: string;
  onPhraseChange?: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(reduced ? phrases[0] : "");

  useEffect(() => {
    if (reduced) return;
    const full = phrases[index];
    let char = 0;
    let hold: ReturnType<typeof setTimeout>;

    const tick = setInterval(() => {
      char += 1;
      setText(full.slice(0, char));
      if (char >= full.length) {
        clearInterval(tick);
        hold = setTimeout(() => {
          const next = (index + 1) % phrases.length;
          setIndex(next);
          onPhraseChange?.(next);
        }, 2600);
      }
    }, 32);

    return () => {
      clearInterval(tick);
      clearTimeout(hold);
    };
  }, [index, phrases, reduced, onPhraseChange]);

  return (
    <span className={className}>
      {text}
      {!reduced ? (
        <span className="ml-0.5 inline-block h-[1em] w-px translate-y-0.5 animate-pulse bg-primary align-middle" />
      ) : null}
    </span>
  );
}

/** Numbers that count up when scrolled into view. */
export function Counter({
  to,
  decimals = 0,
  duration = 1100,
  className,
}: {
  to: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (reduced || !ref.current || done.current) return;
    const el = ref.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic: fast arrival, gentle settle, so the number lands rather
          // than creeping.
          setValue(to * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [to, duration, reduced]);

  return (
    <span ref={ref} data-numeric className={className}>
      {value.toFixed(decimals)}
    </span>
  );
}

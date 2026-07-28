---
name: nextjs-frontend
description: Conventions for adding pages, components, and routes to the apps/web Next.js frontend — App Router route groups, shadcn/ui, Tailwind v4 design tokens, and which docs govern UI decisions in this repo.
---

# Next.js Frontend Conventions (`apps/web`)

## Structure
- App Router, `src/` dir, route groups under `src/app/` split by role: `(public)`, `(candidate)`, `(recruiter)`, `(organizer)`, `(judge)`, `(admin)`. New pages go inside the matching role group, not loose in `src/app/`.
- shadcn/ui components live in `src/components/ui/`. Add new ones with `npx shadcn@latest add <name>` — don't hand-roll a component shadcn already provides.
- Feature-specific (non-shadcn) components belong next to the feature, not dumped in `components/ui/`.

## Styling — Tailwind v4 (no `tailwind.config.ts`)
- This project uses Tailwind v4's CSS-first config. All theme tokens live in `src/app/globals.css` inside `@theme` / `@theme inline` blocks — there is no `tailwind.config.ts` to edit.
- Brand color tokens (`ink`, `paper`, `teal-verified`, `amber-pending`, `rose-flagged`, `slate`) are already defined in `globals.css` per doc `multi-agent-architecture/09` §2 — reuse them (`bg-ink`, `text-teal-verified`, etc.) rather than inventing new colors.
- Fonts are wired in `src/app/layout.tsx`: `--font-display` (Space Grotesk, headings), `--font-sans` (IBM Plex Sans, body), `--font-geist-mono` (IBM Plex Mono, code). Use Tailwind's `font-heading`/`font-sans`/`font-mono` utilities, don't add new font imports without updating both files together.

## Libraries already installed
`framer-motion`, `recharts`, `@dnd-kit/core` + `@dnd-kit/sortable`, `lucide-react`, `next-themes`, `@monaco-editor/react`, `pyodide`. Check these before adding a new animation/chart/DnD/icon dependency — most needs are already covered.

## Hard boundary (per `doc/multi-agent-architecture/00` §2.1)
- Next.js never talks to the database or runs business logic. All data access goes through the FastAPI backend (`services/api`) over HTTP — no Next.js Server Actions, no `app/api/*` route handlers for business logic.
- Code execution (candidate submissions) is Pyodide/WASM, client-side only — there is no server-side sandbox in this stack.

## Before building a page or component
Check, in this order: `doc/SRS/01-06` (§8-9, that module's frontend/UX requirements) → `doc/multi-agent-architecture/09` (design system/tokens) → `doc/multi-agent-architecture/10` (exact route + component inventory) → `doc/multi-agent-architecture/11` (the plain-English user flow it belongs to). Don't invent a route, field, or flow that isn't in one of these.

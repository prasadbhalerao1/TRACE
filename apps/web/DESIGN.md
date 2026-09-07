# TRACE - Design System

The specification the UI is built against. Values here are fixed and measured, not
improvised per page. If a page needs something not in this document, the document
changes first.

Implemented in `src/app/globals.css`. Tailwind v4: there is no `tailwind.config.*`, all
configuration lives in that file's `@theme` blocks.

---

## 1. Design thesis: an instrument that shows its work

TRACE scores people on evidence. The backend was built to be auditable: every
`TalentScoreResponse` carries `confidence`, `score_version` and `computed_at`; every
`SubScore` carries `evidence` (agent-run IDs) and a `rationale`. `EvidenceConfidence`
documents its own reason for existing:

> *"Recruiters should treat scores below the 50% confidence threshold as based on a
> **sparse profile, not a weak candidate**."*

The interface must carry that honesty. A number without its provenance is a worse
product, not a cleaner one. A recruiter who reads a cold-start score as a weak candidate
has been actively misled.

So: **quiet, dense, precise.** Numbers are first-class and always attributable. Colour is
scarce, and status is the only thing that carries it.

### Two surfaces, two rule sets

| | Landing page (`/`) | The app (every other route) |
| :--- | :--- | :--- |
| Purpose | Convince | Operate |
| Motion | Scroll choreography, spring physics, staggered reveals | State change only |
| Composition | Bento, asymmetric, expressive | One grid, one rhythm, predictable |
| Density | Generous | Dense; this is a data tool |

The landing page shares the app's tokens. The app never imports the landing page's
motion or spotlight effects. A recruiter moving between two app screens must not be able
to tell they were built at different times.

### Rejected outright

Gradient or glass cards. Decorative 3D. The purple-indigo SaaS default. Hero numbers with
no provenance. Cards that each take a different accent colour. Unmodified
component-library defaults. Emoji as UI icons. Em-dashes in UI copy.

---

## 2. Colour

Every value was measured for WCAG contrast on the page ground, not chosen by eye. Values
are OKLCH because its lightness maps predictably onto contrast: a later tweak can hold
accessibility by holding L.

| Token | Hex | On ground | Use |
| :--- | :--- | :--- | :--- |
| `--background` | `#fbfcfd` | - | Page ground, a faint cool off-white |
| `--surface` / `--card` | `#ffffff` | - | Raised surface |
| `--surface-sunken` | `#f7f8f9` | - | Inset wells, table headers |
| `--foreground` | `#13171e` | **17.46:1** | Primary text |
| `--muted-foreground` | `#636a74` | **5.30:1** AA | Secondary text, metadata |
| `--primary` | `#1c56a8` | **6.91:1** AA | Primary actions, active nav, links, focus |
| `--success` | `#1b774c` | **5.40:1** AA | Verified, passed |
| `--warning` | `#96661c` | **4.86:1** AA | Pending, needs attention |
| `--destructive` | `#b23a47` | **5.70:1** AA | Flagged, failed, destructive |
| `--info` | `#367284` | **5.25:1** AA | Neutral informational |

The ground is deliberately not pure white, so white surfaces read as raised without
needing a heavy shadow.

### The accent rule

Cobalt appears **only** on: primary actions, active navigation, links, focus rings and
text selection. Never as a card background. Never as decoration.

**The accent is not a status colour.** Verification carries `--success`, so "primary
action" and "verified" can never be confused. (The previous system used one teal for
both, which made them indistinguishable.)

Neutrals carry a consistent cool bias. The palette never mixes warm and cool greys.

### Status band

The four status colours sit within **4.86-5.70:1**, so no status shouts louder than
another, and each is a distinct hue so meaning never rests on lightness alone.

`--warning` is held at `#96661c`. The obvious lighter amber measures 2.93:1 and fails AA
even at large sizes, which is an accessibility bug when it is the colour encoding "needs
attention".

### Charts

`--chart-1..5` = cobalt `#1c56a8`, green `#1b774c`, amber `#96661c`, rose `#b23a47`,
mauve `#855ea1`. Each >=4.8:1 on the ground, separable in greyscale by lightness, ordered
so the first two cover the common two-series case.

**No value repeats.** A ramp that reuses a colour renders two series identically, and
any list consuming the ramp must cap its slice at `LANGUAGE_COLORS.length` rather than
wrapping with a modulo.

---

## 3. Typography

**Body/UI: Inter. Numeric/IDs: IBM Plex Mono.** Two faces, no third.

Inter is chosen for a measured reason: it enables **tabular numerals by default**; IBM
Plex Sans does not. This product renders `toFixed()` in 33 places, and scores,
percentiles and counts must align in columns and must not jitter as they update.

Tracking tightens as size grows.

| Role | Size / Line height | Weight | Tracking | Scope |
| :--- | :--- | :--- | :--- | :--- |
| Display | 52px / 1.04 | 600 | `-0.035em` | Landing hero only |
| Headline | 32px / 1.15 | 600 | `-0.028em` | Landing sections only |
| Page title | 24px / 1.25 | 600 | `-0.022em` | App page titles |
| Section title | 17px / 1.4 | 600 | `-0.012em` | App section titles |
| Body | 14px / 1.55 | 400 | `0` | |
| Label / meta | 12px / 1.35 | 500 | `0` | |

**The app tops out at `title`.** Display and headline exist for the landing page.

Weight tops out at **600**. `font-extrabold` and `font-black` are off-scale: emphasis
comes from size and colour, not a heavier weight.

No uppercase micro-labels below 12px. The `text-[10px] uppercase tracking-wider` pattern
is retired; it reads as decoration and is hard to scan.

Numbers always get `font-variant-numeric: tabular-nums` (applied globally to `table` and
`[data-numeric]`). Evidence IDs, hashes and score values get the mono face.

Headings get `text-wrap: balance` so they do not stack awkwardly when wrapping.

---

## 4. Surface and elevation

**Shadow-as-border, not CSS borders.** A 1px border renders differently across browsers
and stacks badly against a shadow. One ring instead, tinted toward the neutral hue
rather than pure black:

```css
--shadow-flat:    0 0 0 1px oklch(0.205 0.014 258 / 0.09);
--shadow-raised:  0 0 0 1px …, 0 1px 2px oklch(0.205 0.014 258 / 0.05);
--shadow-overlay: 0 0 0 1px …, 0 8px 24px oklch(0.205 0.014 258 / 0.10);
```

Flat for cards and rows at rest. Raised on hover for interactive rows only. Overlay for
popovers, dialogs, chart tooltips and the command palette. Nothing else gets a shadow.

### Radius

`6px` controls, `8px` rows and inputs, `10px` cards. `--radius-xl` and `--radius-2xl`
alias down to `lg`, so a stray `rounded-xl` cannot introduce a fourth value.

### Spacing

`4 · 8 · 12 · 16 · 24 · 32 · 48`. Card padding 20px. Row height 44px.

### Content widths

`1248px` workspace, `720px` forms and reading, full-bleed for boards and tables. Applied
by `Page`, never as an ad-hoc `mx-auto max-w-*` per page.

### Cards are not the default container

Use a card only when elevation communicates real hierarchy. Otherwise group with
`divide-hairline`, a `border-t`, or whitespace. A dashboard should read as an
information system, not a collection of floating rectangles.

---

## 5. Motion

**In the app:** `120ms` for hover and press, `180ms` for enter and exit. Motion
communicates state change and nothing else. No scroll-triggered animation, no staggered
lists, no parallax.

**On the landing page:** scroll choreography, staggered reveals and spring physics are
permitted, and are the point. Effects stay in isolated `"use client"` leaves so the page
shell still streams as a Server Component.

All of it sits behind `prefers-reduced-motion: reduce`, honoured globally in
`@layer base` so a new animation cannot forget it.

---

## 6. Evidence conventions

Product-specific, and the part that most distinguishes this UI from a generic dashboard.

- **A score never renders alone.** It carries its confidence and `computed_at`.
- **Low confidence is not low score.** Below the 50% threshold the UI says *sparse
  profile*. It never styles the score as weak, and never uses `--destructive` for it.
- **`null` sub-scores read "not yet computable"**, never `0`, never a dash. The
  distinction between "no evidence" and "bad evidence" is the product.
- **`rationale` and `evidence` are reachable** via `EvidencePopover` from anywhere a
  score appears. Provenance is a feature, not debug output.
- **A match percentage always ships its breakdown.** Skill overlap, semantic similarity,
  experience, project relevance and talent-score alignment are shown alongside it.
- **Fraud flags are display-only.** They never affect ranking or sort order.

---

## 7. States

Every data surface implements all five. A page that only handles the happy path is
incomplete, not shippable.

| State | Treatment |
| :--- | :--- |
| Loading | Skeleton matching final dimensions. Never a spinner for page-level loads |
| Empty | `EmptyState`: icon, what this is, why it is empty, one action |
| Error | `SectionError` / `RouteError`: what failed, a retry |
| Connecting | `ConnectionState`. A booting API is not an error |
| Populated | The real thing |

Empty states never say "No data found". They explain and offer the next action.

### Feedback

Every mutation confirms. Toast for lightweight success, inline for validation,
`ConfirmDialog` for anything destructive. Never `window.confirm`.

---

## 8. Accessibility

Non-negotiable, and cheaper to build in than to retrofit.

- Every interactive element reachable and operable by keyboard, with a visible
  `focus-visible` ring in `--primary`.
- Icon-only controls carry `aria-label`. Async regions carry `aria-live`.
- Form controls are labelled; errors are wired via `aria-describedby` and `aria-invalid`.
- Colour is never the sole carrier of meaning. Status pairs colour with a label or icon.
- Touch targets >=44px. Contrast >=4.5:1 for text (see §2, all measured).
- `prefers-reduced-motion` honoured globally.

---

## 9. Component rules

- **Reuse before building.** The primitives in `components/ui/` are `shadcn base-nova` on
  `@base-ui/react` (not Radix). Compose polymorphically with the `render` prop:
  `<Button render={<Link href="…" />}>`.
- **No hand-rolled equivalents** of an existing primitive. A raw
  `<input className="border rounded px-3 py-2">` next to a real `Input` is the
  inconsistency this system exists to remove. The same applies to re-skinning a
  primitive: `<Button className="bg-foreground text-white">` is a second button style.
- **Charts share their chrome.** `ChartTooltipContent`, `CHART_TICK`, `CHART_GRID` and
  `CHART_CURSOR` in `components/ui/chart.tsx` are the single definitions. Recharts
  renders SVG `<text>`, which does not inherit the page font, so ticks must be styled
  through these constants rather than with classes.
- **One icon family: lucide.** No emoji, no second library, consistent stroke and size.
- **Semantic tokens only.** No `slate-*`, `sky-*`, `indigo-*`, or hex in component code.
- **Light theme only.** No `dark:` variants and no `prefers-color-scheme` branching. The
  app has no theme provider, so both are unreachable code paths that silently diverge.

---

## 10. Copy

- **No em-dashes** anywhere a user can read: headlines, labels, buttons, body, toasts,
  empty states, alt text. Use a period, comma, colon, parentheses, or a spaced hyphen.
- Buttons name what happens: "Analyze presentation", not "Submit". The action keeps its
  name through the flow, so "Publish" produces "Published".
- No internal jargon in the interface. A user manages *candidate search*, not "Qdrant
  semantic re-rank".
- Errors say what failed and what to do next. They do not apologise and are never vague.

# TRACE — Design System

The specification the UI is built against. Values here are **fixed and measured**, not
improvised per page. If a page needs something not in this document, the document
changes first.

---

## 1. Design thesis: an instrument that shows its work

TRACE scores people on evidence. The backend was built to be *auditable* — every
`TalentScoreResponse` (`packages/shared_schemas/candidates.py:92`) carries `confidence`,
`score_version` and `computed_at`; every `SubScore` carries `evidence` (agent-run IDs)
and a `rationale`. `EvidenceConfidence` documents its own reason for existing:

> *"Recruiters should treat scores below the 50% confidence threshold as based on a
> **sparse profile, not a weak candidate**."*

The interface must carry that honesty. A number without its provenance is a worse
product, not a cleaner one — a recruiter who reads a cold-start score as a weak candidate
has been actively misled.

So: **quiet, dense, precise.** Numbers are first-class and always attributable. Colour is
scarce enough that verification state is the only thing that carries it.

### Rejected outright

Gradient or glass cards. Decorative 3D. The purple-indigo SaaS default. Hero numbers with
no provenance. Cards that each take a different accent colour. Animation on scroll.
Unmodified component-library defaults. Emoji as UI icons.

These are the statistical centre of "AI-generated SaaS UI". Avoiding them is the point.

---

## 2. Colour

Every value below was measured for WCAG contrast on white, not chosen by eye.
Status colours sit in a deliberately tight **4.95–6.45:1** band so no status shouts
louder than another.

| Token | Hex | On white | Use |
| :--- | :--- | :--- | :--- |
| `--primary` | `#0e7c86` | **4.95:1** AA | Primary actions, active nav, links, focus, verified |
| `--primary-foreground` | `#ffffff` | 4.95:1 on teal | Text on primary fill |
| `--success` | `#0e7c86` | 4.95:1 AA | Verified / passed (same as primary, by design) |
| `--warning` | `#96661c` | **4.98:1** AA | Pending / needs attention |
| `--destructive` | `#b23a48` | 5.85:1 AA | Flagged / failed / destructive |
| `--info` | `#1e5fa8` | 6.45:1 AA | Neutral informational |
| `--foreground` | `#12161c` | 18.15:1 | Primary text |
| `--muted-foreground` | `#5b6472` | 5.98:1 AA | Secondary text, metadata |
| `--background` | `#ffffff` | — | Page |
| `--card` | `#ffffff` | — | Raised surface |
| `--muted` | `#f6f7f8` | — | Inset / hover fill |
| `--border` | `rgba(0,0,0,0.08)` | — | See §4 |

**`--warning` was darkened from the original `#c98a2c`, which measured 2.93:1 and failed
AA even for large text** — while encoding "pending" status. That was an accessibility bug,
not a style preference.

### The accent rule

Teal appears **only** on: primary actions, active navigation, links, focus rings, text
selection, and verification state. Never as a card background. Never as decoration. Never
to make a section "pop". Everything else is neutral.

Neutrals carry **zero chroma** — grey is grey. A tinted grey reads as a mistake next to a
single saturated accent.

### Charts

`--chart-1..5` = teal `#0e7c86`, slate `#5b6472`, amber `#96661c`, rose `#b23a48`,
indigo `#4c5bd4`. Each ≥3:1 on white, distinguishable in greyscale by lightness, and
ordered so the first two cover the common two-series case.

---

## 3. Typography

**Body/UI: Inter. Numeric/IDs: IBM Plex Mono.** Two faces, no third.

Inter is chosen for a measured reason: it enables **tabular numerals by default**; IBM
Plex Sans does not. This product renders `toFixed()` in 30 places, and scores, percentiles
and counts must align in columns and must not jitter as they update. Space Grotesk is
dropped — a display face earns nothing in a dense data tool.

Tracking tightens as size grows. This is the most reliable signal of deliberate
typography, and its absence is the most reliable signal of a default.

| Role | Size / Line height | Weight | Tracking |
| :--- | :--- | :--- | :--- |
| Page title | 24px / 1.25 | 600 | `-0.96px` |
| Section title | 18px / 1.4 | 600 | `-0.36px` |
| Body | 14px / 1.55 | 400 | `0` |
| Label / meta | 12px / 1.35 | 500 | `0` |
| Numeric | 13–24px | 500 | `tabular-nums` |

Five sizes, and no more. **No uppercase micro-labels below 12px** — the existing
`font-heading text-[10px] uppercase tracking-wider` pattern is retired; it reads as
decoration and is hard to scan.

Numbers always get `font-variant-numeric: tabular-nums`. Evidence IDs, hashes and score
values get the mono face.

---

## 4. Surface and elevation

**Shadow-as-border, not CSS borders.** A 1px border renders differently across browsers
and stacks badly against a shadow. One ring instead:

```css
--elevation-flat:    0 0 0 1px rgba(0, 0, 0, 0.08);
--elevation-raised:  0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
--elevation-overlay: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.08);
```

Flat for cards and rows at rest. Raised on hover for interactive rows only. Overlay for
popovers, dialogs and the command palette. Nothing else gets a shadow.

### Radius

`6px` controls · `8px` rows and inputs · `12px` cards. Three values, all derived from
`--radius`. Fully-round is reserved for avatars and pills.

Three radii on peer elements is the current bug (`rounded` / `rounded-md` / `rounded-xl`
on a row, an input and its card) — it is what makes the app read as assembled rather than
designed.

### Spacing

`4 · 8 · 12 · 16 · 24 · 32 · 48`. Card padding **20px**. Row height **44px** — denser
than a comfortable list, looser than Linear's 36px, which suits rows carrying two lines of
metadata.

### Content widths

`1200px` workspace · `720px` forms and reading · full-bleed for boards and tables.
Applied by `PageHeader` and the page shell, never as an ad-hoc `mx-auto max-w-*` per page.

---

## 5. Motion

`120ms ease-out` for hover and press. `180ms ease-out` for enter/exit. That is the whole
system.

**No scroll-triggered animation. No staggered lists. No parallax.** Motion communicates
state change and nothing else.

All of it sits behind `prefers-reduced-motion: reduce`, which must be honoured globally —
not per component.

---

## 6. Evidence conventions

Product-specific, and the part that most distinguishes this UI from a generic dashboard.

- **A score never renders alone.** It carries its confidence and `computed_at`.
- **Low confidence is not low score.** Below the 50% threshold the UI says *sparse
  profile* — it never styles the score as weak, and never uses `--destructive` for it.
- **`null` sub-scores read "not yet computable"**, never `0`, never `—`. The distinction
  between "no evidence" and "bad evidence" is the product.
- **`rationale` and `evidence` are reachable**, via `EvidencePopover`, from anywhere a
  score appears. Provenance is a feature, not debug output.
- **Verification state is the only carrier of the accent.**

---

## 7. States

Every data surface implements all five. A page that only handles the happy path is
incomplete, not shippable.

| State | Treatment |
| :--- | :--- |
| Loading | Skeleton matching final dimensions — never a spinner for page-level loads |
| Empty | `EmptyState`: icon, what this is, why it's empty, one action |
| Error | `PageError`: what failed, a retry |
| Connecting | `ConnectionState` — a booting API is not an error |
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
- Form controls are labelled; errors are wired via `aria-describedby` and
  `aria-invalid`.
- Colour is never the sole carrier of meaning — status pairs colour with a label or icon.
- Touch targets ≥44px. Contrast ≥4.5:1 for text (see §2 — all measured).
- `prefers-reduced-motion` honoured globally.

---

## 9. Component rules

- **Reuse before building.** The primitives in `components/ui/` are `shadcn base-nova` on
  `@base-ui/react` (not Radix). Compose polymorphically with the `render` prop:
  `<Button render={<Link href="…" />}>`.
- **No hand-rolled equivalents** of an existing primitive. A raw `<input className="border
  rounded px-3 py-2">` next to a real `Input` is the inconsistency this system exists to
  remove.
- **One icon family: lucide.** No emoji, no second library, consistent stroke and size.
- **Semantic tokens only.** No `slate-*`, `zinc-*`, `indigo-*`, or hex in component code.
- **Light theme only.** No `dark:` variants — the app has no theme provider, so they are
  unreachable code.

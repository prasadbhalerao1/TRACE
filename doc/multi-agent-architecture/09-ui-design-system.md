# Module 8 — UI Design System & Landing Page

This doc defines the visual identity, component/library choices, and landing page content plan.
Go for ambitious, beautiful, sophisticated design without the handcuffs.

---

## 1. Design Concept

The product's thesis is **"proof over paperwork"** — every claim gets verified against real evidence.
The UI should *make this visible and beautiful*.

Forget the monospace receipt look. Think bigger: dynamic data visualization, rich micro-interactions,
sophisticated gradients, typography that breathes. The verification status should feel like a moment
of truth — something worth looking at, memorable, beautiful. Every interaction with proof should feel
premium.

Consider:
- **Animated data transforms** — claims morph into verification status with satisfying motion
- **Rich information density** — proof layers revealed through interaction, not cramped into cards
- **Sophisticated color storytelling** — verified/unverified/flagged states expressed through elegant
  color, shadow, and luminance, not just badges
- **Typography hierarchy** — bold choices in display, elegant restraint in body. Let the fonts *sing*
  where it matters.
- **Glassmorphism, depth, subtle animation** — build an interface that feels alive and responsive

The interface itself becomes proof of quality. Beautiful design = trustworthy platform.

## 2. Design Language

**Color:** Build an extended palette. Include:
- Rich accent colors for verification states (go vibrant if it serves the story)
- Sophisticated neutrals (multiple grays/beiges at different luminances)
- Accent colors for secondary states
- Gradient combinations for depth and visual interest
- Light and dark mode variants that feel intentional, not just inverted

Don't limit yourself to 6 colors. Use gradients, overlays, and transparency strategically.

**Typography:** Pick 2-3 font families maximum, but use them boldly:
- A striking display face for hero and key moments (consider: geometric sans-serif, transitional,
  even experimental fonts if they read well)
- A refined body font (Georgia, Crimson, or sophisticated sans)
- Monospace only where it genuinely adds meaning (code, technical details)

Let headlines have personality. Adjust letter-spacing, font-weight, text-transform freely.

**Layout & Spacing:** No rigid rules. Use:
- Generous whitespace where content breathes
- Tight spacing where information clusters
- Varied grid/column counts per section (don't default to 12-col)
- Asymmetry intentionally, symmetry when it matters
- Border radius and shadows to create depth hierarchy, not consistency rules

**Motion & Micro-interactions:**
- Animate *everything* that changes state (proof verification, score reveals, section scrolls)
- Scroll reveals should feel sophisticated — stagger, parallax, morphing shapes
- Hover states should delight and inform
- Loading states should feel like progress, not waiting
- Don't animate for animation's sake, but don't be timid either

## 3. Frontend Libraries

| Purpose | Library |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + custom CSS, throw in canvas/WebGL if the moment calls for it |
| Motion | Framer Motion — go ambitious, use orchestration for complex sequences |
| 3D/Visual | Spline, Three.js, or canvas-based animations for hero moments |
| Charts | `recharts` or `plotly` — style them custom, don't use defaults |
| Data viz | D3.js if you need custom, sophisticated visualizations |
| Kanban | `dnd-kit` — make drag-and-drop feel smooth and premium |
| Code editor | Monaco (`@monaco-editor/react`) — custom theme it |
| Icons | Custom SVGs or `lucide-react`, style aggressively |
| Theming | `next-themes` — both modes should feel intentional and different |

The tools enable the vision — pick the right one for each moment, don't default.

## 4. Landing Page — Section Plan

The structure is proven. The execution should be beautiful.

| Section | Content |
|---|---|
| **Nav** | Elegant, minimal, full-width. Logo + nav links + CTAs. Should feel premium on first load. |
| **Hero** | *"Hire on proof, not paperwork."* Massive, bold headline. Proof visualization as the centerpiece — maybe animated data streams, morphing claims into scores, or a sophisticated interactive element that *shows* the product in motion. Not a generic gradient. Two CTAs that don't look like every other SaaS. |
| **The problem** | Transform the before/after into something visual and rich. Claim states, verification flowing in. Should feel like a moment of insight. |
| **How it works** | Sequential steps, but design-forward. Consider: animated timeline, staggered reveals, visual progression. Should feel like a journey, not a checklist. |
| **For Candidates / For Recruiters** | Rich feature showcases — use screenshots, micro-interactions, or embedded product moments. Should feel like a peek inside something valuable. |
| **Trust & Verification** | Make the proof visible. Show score calculations, fraud detection flows, verification pathways. Interactive if possible. |
| **Hackathon callout** | Design this as a distinct moment — different color, different energy. Make organizers feel special. |
| **Footer** | Clean, sophisticated. Links, legal, maybe a CTA. |

## 5. Copy Voice

Plain, active, specific. Buttons do exactly what they say. Avoid corporate speak entirely.
Errors are clear and helpful. Empty states guide without apologizing.

But let the *design* carry the voice too — premium typography, color, motion. Beautiful and honest.

---

## The Mandate

No more "tasteful restraint" or "deliberately minimal." We want beautiful, sophisticated, ambitious design
that makes people want to *use* the product. The product is about proof — make the interface proof of quality.

Pixel-perfect, delightful, no slop.

*Continue to `10-folder-structure-and-accessibility.md`.*

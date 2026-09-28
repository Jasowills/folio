# Design System — Folio & (Archive Dossier)

## Visual Theme & Atmosphere

A custody dossier flattened into a sheet. The ground is warm paper **FDFCF8** under a **6px forest top rule**, with ledger ruling every 32px at 7% forest. The page reads as an editorial audit, not a SaaS dashboard: generous negative space charged as **ma**, tabular density where scores live, and one overlapping dossier object (the 72/100 ledger at -1.4deg, shadow-resume) as the unforgettable artifact. Quiet, precise, hiring-desk authority with the calm of an archive. The second-read is the forest ribbon that threads from the ledger's top rule into the interview theatre's waveform.

## Color Palette & Roles

- **Paper** `#FFFFFF` — primary surface, cards, modals
- **Cream Wash** `#F6F9F2` — ticker, dossier washes, dashed explainer
- **Paper Dark** `#EEF3E8` — subtle section alternation, progress track
- **Ink** `#0A1F18` — primary text, 12:1 on paper, masthead, CTA solid
- **Ink Light** `#1A3328` — hover on ink
- **Forest** `#14532D` — single accent: top rule, LIVE dot, waveform bars, score chips, focus rings, selection, caret, scrollbar thumb
- **Forest Light** `#E6F4EA` — chips, ledger marginalia wash
- **Muted** `#5A6E5E` — secondary text, mono labels
- **Muted Light** `#8FA396` — tertiary, footnotes
- **Border** `#DDE5D8` — hairlines, card strokes
- **Border Light** `#EEF3E8` — dividers
- **Danger** `#8B1E1E` — low scores only

One accent only. No purple/blue glow, no rainbow, no neon halo. Forest repeats on every interactive surface; cream repeats on every calm ground.

## Typography Rules

- **Display:** Fraunces, 700/800, `opsz 9..144`, tight tracking `-0.04em`, line 0.96–1.08, italic used once for *honestly* in hero. Hero `clamp(2.9rem,5.2vw,5.6rem)`, section `3xl–6xl`, never wrapping to 6 lines. `text-wrap: balance`.
- **Body:** Satoshi 400/500/700, 15–17px, 1.6 leading, `65ch` max where it matters, neutral muted hierarchy.
- **Mono:** JetBrains Mono 400/500/700, 11–13px, tracked `0.08em` for labels, `0.12em` for KICKER, tabular numbers for scores/timers.
- **Banned:** Inter, Roboto, Space Grotesk, Plus Jakarta as display; gradient text; all-caps body; 6-line headings. Fraunces is pinned by brief, so the detector's overused-font warning is acknowledged and kept.

## Component Stylings

- **Masthead:** sticky `bg-paper/90` blur, `h-1 bg-teal` rule, `Folio & ED. 04` mono dateline, 13px nav, hairline bottom rule. No floating pill.
- **Ledger Card:** `rounded-[24px]`, `border-border`, `shadow-resume`, `h-1.5 bg-teal`, `paper-ruling` interior (repeating 32px at 7% forest). Rows: hairline dashed, mono K / 14px semibold V, marginalia block in `teal-light`.
- **UploadZone:** `rounded-[24px]`, `border-2 dashed`, `isDragging ? teal/teal-light : border/border hover:teal/50`, `-translate-y-1` on drag, hidden `file-upload` input, mono footnote.
- **Buttons:** Primary `bg-ink text-white 14px bold rounded-full 7/3.5 py`, `hover:ink-light`, `-1px` press, no halo. Secondary `border-border bg-paper text-ink`. Destructive forest is never used for primary.
- **Ticker:** `marquee-track 28s linear infinite`, `mask` fade 8%–92%, `gap-8`, forest dots, cream ground, hairline y-borders.
- **Bento Cards:** `rounded-[28px]`, `border-border`, `shadow-card → shadow-card-hover`, `overflow-hidden` + `group-hover:scale-105 700ms` on media. Ink card 7-col, surface cards 5/4-col, `grid-flow-dense`, zero voids.
- **Pinned Teardown:** `border-y`, `paper-light` ground, left `sticky top-24`, right `grow-fade` figures `rounded-[28px]` with `border` + `grayscale` + hover scale.
- **Interview Theatre:** `rounded-[28px]` + `h-1 bg-teal`, `border` + `shadow-card`, forest LIVE pill, mono tag, 22-bar waveform (`w-[3px] h 8–26px`) pulsing only while `isAsking && !muted`, candidate card `rounded-2xl border`, code pane `bg-ink` with `JetBrains Mono` 12–14px, `bg-white/[0.06]` pre.
- **Accordions:** `md:h-[480px] md:flex-row`, `rounded-[28px]`, `grayscale contrast-125` image + `bg-ink/55 → 75` overlay, `flex-[2.4]` active expansion 500ms.
- **Toasts, Inputs, Rules:** `input-field` `border-border` + `focus teal` + `3px teal 12%` ring; `ink-rule` gradient `teal → transparent 85%`.

## Layout Principles

12-col grid, `max-w-6xl` centered, `px-6`, `gap-5–10`. Hero `md:grid-cols-12` 7/5 split, ledger overlapping at `-1.4deg` with `shadow-resume` and two decorative blurs behind. Bento `grid-cols-12 grid-flow-dense` 7+5 / 4+4+4. Teardown `lg:grid-cols-[380px_1fr]` with `pin` on desktop. Interview `lg:grid-cols-[400px_1fr]` with `sticky top-24` copy. Vertical rhythm `py-24 md:py-32` per chapter, even, with more space above heading than below. `overflow-x-hidden w-full max-w-full` on main, `min-h-[100dvh]` never `h-screen`. No `calc()` percentage hacks.

## Motion & Interaction

Spring: `stiffness 100, damping 20` equivalent via `power3.out`. Hero `scale 1.08→1` 1.4s + `y 28→0` 0.9s stagger 0.1. `grow-fade` `scale 0.86→1` scrub `0.6` (`top 88% → top 40%`). Manifesto `scrub-word opacity 0.1→1` scrub `0.5`. Accordions `transition 500ms` on `flex`. Cards `scale-105 700ms ease-out` inside `overflow-hidden`. Waveform `animate-pulse 520ms` per bar. One authored entrance per section, no scattered spinners. Motion respects `prefers-reduced-motion: reduce` to `0.01ms`.

## Anti-Patterns (Banned)

No purple/blue AI gradients, no neon halos, no glass decoration, no gradient text, no sparkles, no floating icons, no icon+heading+text cards as page structure, no centered hero, no 3-equal-cards row, no kicker above heading, no section numbers, no fake testimonials/logos/pricing, no lorem, no Inter, no pure black #000, no custom cursor, no overlapping text on images without scrim, no fixed-px grid that breaks at 1280.

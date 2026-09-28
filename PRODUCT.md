# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: active job seekers at all levels — from new grad to executive — in the moment they have a resume file and often a target job description. They hire Folio to get an honest, scored teardown and the immediate means to fix it, not flattery or a template alone. No persona filter. Secondary audiences include career switchers validating a new positioning and tech-heavy candidates who need code-aware interview rehearsal. All act in a browser, often under time pressure before an application.

## Product Purpose

Folio is an end-to-end job-search operating system that starts from a single upload. It exists to collapse the fragmented toolchain (critique separate from rewrite, rewrite separate from ATS, ATS separate from sourcing, sourcing separate from interview practice) into one honest ledger. Success is a higher interview rate because the resume was measured, rewritten, matched, and rehearsed — not just reformatted.

## Positioning

End-to-end OS: one upload → structured rewrite → ATS scoring vs any JD or URL → tailored cover letters → portfolio check → 18-source job discovery with tracking → voice interview rehearsal with live coding and company research. Neighboring builders can copy templates or a single ATS score; they cannot truthfully copy the closed loop where the ledger that scores is the same ledger that rewrites, matches, and rehearses, grounded in the user's actual file and the target role's language.

## Operating Context

Core workflows: guest teardown (PDF/DOCX → 30s analysis, 6-hour TTL share link) and authenticated loop (structured JSON editor + PDF block editor, AI wizard for bullets/summaries/skills, 50 templates across single/two-column/sidebar with 15 themes, deterministic PDF/DOCX render). ATS scorer accepts pasted JD or URL and keeps history with keyword gaps. Cover letters stream via SSE with tone control and history. Portfolio check crawls a URL via Playwright and compares to resume. Job discovery aggregates 18 crawlers (LinkedIn, Greenhouse, Lever, Wellfound, YC, HN, RemoteOK, etc.) with save/hide and application tracker (status, notes, checklist). Company research scrapes URL for mission/values/news. Interview prep: role/level/company/stack → question plan → live WebSocket session with Deepgram STT/TTS, barge-in, Monaco editor (13 languages via Piston), proctoring (face/gaze, tab-switch), then scored results. Export via template + theme. Storage is Cloudinary. AI is Ollama primary → OpenRouter → Groq fallback. Constraints: web-only, drag-and-drop upload, inline editing, and real-time voice must work in-browser without native install.

## Capabilities and Constraints

Confirmed: 22 server modules (auth, users, resumes, builder, ats, cover-letters, crawler, upload, storage, discover, jobs, auto-apply, referrals, salary, interviews, research, company-verification, export, etc.), 23 client pages, zustand `useAuth` with 15m/7d JWT + Google OAuth + email/password, Throttler rate limiting, Cloudinary, Playwright crawling, Sentry/Helmet/compression on server, `validate-env` fail-fast, better-sqlite3 harness in `folio-v2` (5 model adapters, router, repair loop, REPL). Terminology: teardown, ledger, ATS fit, marginalia, rehearsal, tracker.

Constraints: must not invent proof; must use real flows (guest TTL, template count, crawler sources, interview pipeline) and mark gaps as undecided. Must keep white + forest editorial system and ledger language where the user pinned it. Must preserve deterministic rendering and not hallucinate AI scores. Undecided: pricing, packaging, customer logos, hiring-outcome guarantees, team/workspace RBAC.

## Brand Commitments

Name `Folio &` with ampersand as mark. Voice: hiring-manager honest, calm, editorial — not cheerleader, no "unleash / elevate / seamless / next-gen." Visual commitment pinned by user: white (`#FFFFFF`) + deep forest `#14532D` on ink `#0A1F18` with cream `#F6F9F2` washes, border `#DDE5D8`, Fraunces display (700/800) + Satoshi body + JetBrains Mono for scores/code/marginalia, ledger ruling and check-mark construction, no purple/blue AI glow, no generic SaaS dash. References to `&` watermark and ledger marginalia are binding where they serve hierarchy.

## Evidence on Hand

Real content and paths: `client/src/pages/Home.tsx` (hero + ledger + interview theatre), `client/src/components/UploadZone.tsx`, `client/src/index.css` (forest tokens, ruling, grain), `client/index.html` (Fraunces/Satoshi/Mono), `server/src/modules/*` (22 modules), `folio-v2/` harness (`packages/harness`, `resume-schema`), `docs/interview-prep.md`, `RESUME_TEMPLATES.md` (50 templates tracked). Reusable brand asset: `client/src/components/brand/BrandKitBoard.tsx` (3×3 board as code). No real testimonials, customer logos, pricing, or outcome benchmarks on file — future work must not fabricate them; use only the guest flow, template inventory, and crawler list as proof, and label other claims as illustrative or undecided.

## Product Principles

1. Honesty over flattery — score first, then fix.
2. Ledger over dashboard — every insight lives on the document it measures.
3. End-to-end over point tool — rewrite, match, and rehearsal share the same file.
4. Craft over slop — editorial restraint, dense where it must be, airy everywhere else.

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond the web platform baseline. Future surfaces must meet WCAG 2.2 AA, keyboard operability, and clear focus, especially for upload, editor, and interview controls where timing and voice add cognitive load.

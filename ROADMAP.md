# Folio Roadmap — rewritten 2026-09-24

> Previous version (2026-06-20) is stale: it marks as missing large areas that are
> shipped. This rewrite is based on a file-evidence audit of `client/src`,
> `server/src`, and `folio-v2/` on `main@3df247d`. Old phase numbers kept for traceability.

## Where we are (TL;DR)

* **V1 web app (`client/` + `server/`) is feature-complete and beyond old Phases 1–4.**
  22 server modules, 23 client pages. Auth, upload, crawler, dashboard all done —
  plus ATS, cover letters, interview sim w/ voice + live coding + proctoring, job
  discovery (18 crawlers), auto-apply, referrals, salary, resume diff, apply-odds,
  company verification.
* **Storage decision changed:** R2 → **Cloudinary** everywhere (`storage.service.ts`).
  Old roadmap items saying "R2" should be read as Cloudinary.
* **State decision changed:** React Context → **zustand `useAuth`** (`hooks/useAuth.ts`).
  `context/` is empty by design.
* **Folio-v2 (`folio-v2/`) Milestone 1 DONE** (Sep 18): pnpm monorepo, 5-model harness,
  router + circuit breaker, Zod repair loop, sqlite sessions, REPL.
  M2 (resume wiring + deterministic render) and M3 (Electron shell) are next.

---

## Phase 1 — Auth & User Foundation ✅ DONE (with deltas)

### Server — all DONE
- [x] User schema (`modules/users/schemas/user.schema.ts:6-24` — email, googleId, password, refreshTokenHash)
- [x] JWT 15m access / 7d rotating refresh (`auth/auth.service.ts:107-113`, `auth.module.ts:16`)
- [x] Google verification (`auth.controller.ts:159-170`, `auth.service.ts:19-35,70-78`)
- [x] Refresh (`auth.controller.ts:104-116`, `auth.service.ts:84-99`)
- [x] Logout (`auth.controller.ts:136-145`, `auth.service.ts:101-103`)
- [x] Rate limiting — **old roadmap wrong**: `ThrottlerModule` short/medium/long (`app.module.ts:35-39`), `APP_GUARD` (`app.module.ts:70-72`), `PerUserThrottlerGuard`, `@Throttle` on resumes/auto-apply controllers
- [x] Email/password — **old roadmap wrong (listed optional)**: signup/login w/ bcrypt (`auth.service.ts:58-82`, `auth.controller.ts:80-102`, `dto/login.dto.ts`)

### Client — DONE except One Tap
- [x] Google button login (NOT One Tap): `pages/Login.tsx:78-89,180-195`, `Signup.tsx:91-101`, `AuthCallback.tsx:11-30`, `hooks/useAuth.ts:46-52`
- [ ] Google One Tap — missing. `@react-oauth/google@0.13.5` installed but never imported
- [x] Auth store (replaces Context): zustand `hooks/useAuth.ts:25-78` — `context/` intentionally empty
- [x] Protected routes (inline, no separate file): `App.tsx:64-76,95-116`
- [x] Refresh interceptor: `lib/api.ts:24-47` (401 → POST /auth/refresh → retry, else session-expired → /login)
- [x] Login/Signup/Callback pages + logout (`AppShell.tsx:48,197`, `Settings.tsx:259-321`, `useAuth.ts:70-77`)

### Acceptance — met except One Tap
- [x] Google sign-in works · [x] 401 auto-refresh · [x] server-side logout

---

## Phase 2 — File Uploads ✅ DONE (Cloudinary, not R2)

### Server — DONE
- [x] Upload endpoint + mime/size validation (`upload/upload.controller.ts:36-46` FileInterceptor, `:73-85` photo, `:48-59` list, `:61-71` delete)
- [x] Cloudinary (replaces "R2 bucket" in acceptance): `storage/storage.service.ts:19-48`, `app.module.ts:40-46`, `upload.service.ts:37-41,98-102`
- [x] Metadata schema (`upload/schemas/upload.schema.ts:7-25` — userId, originalName, key, url, mimeType, size)
- [~] Multer memory storage: no `memoryStorage` literal; functionally memory via `file.buffer` (`upload.service.ts:37`). Explicit config missing but behavior correct.

### Client — DONE except progress %
- [x] Drag-drop: `components/UploadZone.tsx:14-32`, `ResumeBuilder.tsx:530-534`, `Dashboard.tsx:119-132`
- [~] Client validation inconsistent: `ResumeBuilder.tsx:12,496` enforces 15MB + `.pdf,.docx`; `UploadZone.tsx:80-117` shows "Max 5MB" text only, silent return, no toast — **fix to single limit + toast**
- [~] Progress: spinners only (`UploadZone.tsx:42-57`, `ResumeBuilder.tsx:489-520`); no `onUploadProgress` % bar — **optional**
- [x] File list: `ResumeBuilder.tsx:901`, `Dashboard.tsx:294-364`
- [x] Delete: `lib/queries.ts:294 useDeleteResume`, `ResumeBuilder.tsx:931-948`

### Acceptance (amended: Cloudinary, not R2)
- [x] PDF < 5MB + DOCX accepted, others rejected · [x] lands in Cloudinary · [x] history on dashboard/builder

---

## Phase 3 — Portfolio Crawler ✅ DONE (Playwright + Cloudinary)

### Server — DONE
- [x] Fire-and-forget + polling: `crawler/crawler.service.ts:57-62`, `crawler.controller.ts:34-66` (POST → 202, GET status/:id)
- [x] Playwright — **old roadmap wrong**: `chromium.launch{headless:true}` (`crawler.service.ts:115`; same pattern in submit-worker, ats, research + 8 adapters/crawlers)
- [x] Screenshot → Cloudinary (not R2): `crawler.service.ts:131-139` (`folio-crawler`)
- [x] Result schema: `crawl-job.schema.ts:6-33` (status, screenshotUrl/Key, metadata, error)
- [x] Cleanup: `crawler.service.ts:89-91,211-224` (`browser.close`, orphan compensate)

### Client — DONE
- [x] URL form: `PortfolioAnalysis.tsx:186-211`, `Research.tsx:176-235`, `AtsScorer.tsx`
- [x] Polling: `lib/queries.ts:993-1024` (3s until completed/failed), `:1085-1099`
- [x] Results: `PortfolioAnalysis.tsx:245-387` (ScoreRing, confirmed/missing, suggestions)
- [x] Error states: `:164-169` inline + `:218-244` failed card + retry

---

## Phase 4 — Dashboard & Results ✅ DONE

### Server — DONE (one naming delta)
- [x] GET history: `crawler.controller.ts:68-79` + `crawler.service.ts:68-83` (paginated)
- [x] GET detail (as `status/:id`, not `:id`): `crawler.controller.ts:58-66`, `service.ts:64-66`
- [x] DELETE: `crawler.controller.ts:81-91`, `service.ts:85-95` (removes Cloudinary screenshot)

### Client — DONE
- [x] Grid: `Dashboard.tsx:217`, `ResumeBuilder.tsx:901`
- [x] Skeletons: `Dashboard.tsx:218-227,284-292`, `ResumeBuilder.tsx:572-589`, `ResumeReview.tsx:322`, `discover/EmptyStates.tsx:11`
- [x] Empty states: `Dashboard.tsx:145-170,668`, `ResumeBuilder.tsx:879-891`, `index.css:435`
- [x] Search/filter/sort: `ResumeBuilder.tsx:599-649`, Discover `FeedFilters`
- [x] Detail: `/resume/:id` → `EditorPage`, `/resume/:id/review` → `ResumeReview` (`App.tsx:99`)

---

## Phase 5 — Admin & Teams (Optional) ⏸️ NOT STARTED — still optional

- [ ] Team/workspace schema · [ ] invite flow · [ ] RBAC guards · [ ] shared results
- No code found. Keep deferred unless v2 needs it.

---

## Phase 6 — Error Monitoring & Prod Readiness 🟡 MOSTLY DONE (server yes, client partial)

### Client — PARTIAL
- [ ] Sentry init — **missing**: no dep, no init in `main.tsx` (only string ref in `data/skills.ts:45`)
- [ ] Source maps — **missing**: `vite.config.ts:6-24` has no `build.sourcemap`, no Sentry plugin
- [x] ErrorBoundary — **old roadmap wrong**: `components/ErrorBoundary.tsx:12-41` + root in `App.tsx:30-54,86`

### Server — DONE except structured logging
- [ ] Structured logging — **genuinely missing**: zero pino/winston; only `new Logger()` + `console.log/error`
- [x] Sentry — **old roadmap wrong**: `@sentry/node`, `Sentry.init` (`main.ts:5,45-49`)
- [x] Helmet — **old roadmap wrong**: (`main.ts:7,51-75`)
- [x] Compression — **old roadmap wrong**: (`main.ts:8,76-83`)
- [x] Env validation fail-fast — **unlisted win**: `common/validate-env.ts` (Mongo, JWT, Cloudinary, Google, CLIENT_URL + Ollama/OpenRouter/Groq conditional)

### Infra — STILL OPEN
- [ ] Docker/Compose — missing (no Dockerfile*, no docker-compose*)
- [ ] Production Dockerfile (multi-stage) — missing
- [ ] CI pipeline (lint→test→build) — missing (no `.github/`)
- [x] Vercel deploys exist (`client/.vercel/`, `server/.vercel/`, `api/index.ts`, `ws-server/`)

---

## Phase 7 — Testing 🟡 SERVER SCAFFOLDED, CLIENT MISSING

### Server — scaffolded
- [x] E2E scaffold: `test/app.e2e-spec.ts` (supertest + mongodb-memory-server, mocks Storage/AI), `jest-e2e.json`, `jest.setup.ts`; `package.json` jest + `test`, `test:e2e`
- [ ] Unit tests per-service (auth token rotation, upload reject logic, crawler lifecycle) — not found as isolated specs
- [ ] Full auth→upload→crawl→results E2E + error cases — scaffold exists, coverage unknown

### Client — MISSING (old roadmap correct here)
- [ ] No runner: zero `*.test.*`/`*.spec.*`, no vitest/jest/MSW/RTL in deps
- [ ] Playwright `test-results/` dir exists but empty; e2e commit `f604245` referenced but no specs in `client/src`

---

## Phase 8 — Polish & Launch 🟡 MOSTLY DONE, dark mode is fake

- [x] Skeletons/spinners — done (see Phase 4)
- [x] Toasts: Radix `ui/toast.tsx:36-107` + `ToastProvider` (`main.tsx:45`), ~75 call sites
- [x] Empty states — done
- [x] Responsive: pervasive `sm:/md:/lg:` (`Login.tsx:108`, `Dashboard.tsx:217`, `AppShell.tsx:210`)
- [x] Keyboard: Esc/Enter/shortcuts tab, textbox roles (`ResumeBuilder.tsx:127,213`, `useEditorKeyboard.ts`, `Settings.tsx:742`)
- [ ] Dark mode — **fake**: `Settings.tsx:143-144,453-472` writes `localStorage settings:theme` only; no `documentElement` class, no `dark:` variants, light-only `@theme` (`index.css:3-52`)
- Launch checklist still manual: Atlas, Cloudinary, Sentry project, Google OAuth creds, custom domain/SSL, CI/CD on merge

---

## V1 remaining gaps (small, ordered)

1. `UploadZone` limit/toast inconsistency (5MB text vs 15MB enforce, silent return)
2. Client Sentry + source maps (server already has Sentry)
3. Real dark mode or remove selector
4. Google One Tap (optional — button flow works)
5. Canonical `GET /crawler/:id` alias (currently only `status/:id`)
6. Server structured logging (pino/winston) to replace console.*
7. Docker + CI + client test runner (vitest + MSW + Playwright specs)

---

## Folio-v2 — local-first harness + Electron (new track)

Spec ref in `folio-v2/README.md:3` points to `../SPEC_FOLIO_V2.md` — **file missing from repo root** (recreate or drop ref).

### Milestone 1 ✅ DONE (verified `3df247d`, Sep 18)
- pnpm monorepo (`pnpm-workspace.yaml`, `tsconfig.base.json`)
- `ModelAdapter` interface (`harness/src/models/types.ts`) — UI-agnostic
- OpenAI-compatible fetch impl (60s abort, tool mapping, `json_object`) (`models/openai-compatible.ts:141`)
- 5 providers: ollama always (`llama3.1:8b` local), opencode/anthropic/openai/gemini on env (`models/providers.ts:111`) — compat shapes for non-Ollama unconfirmed
- Router capability filter + 30s circuit breaker (`models/router.ts:59`)
- `chatStructured` Zod validate + same-adapter repair ×2 + failover (`loop.ts:160`)
- better-sqlite3 WAL store `~/.folio-v2/folio.db`, 6 tables (`memory/store.ts:149`)
- REPL 8 commands (`bin/repl.ts:214`), shared types (`shared-types:56`), full `ResumeDataSchema` zod (`resume-schema:176`)
- ⚠️ "8-call tool budget" declared (`MAX_TOOL_CALLS_PER_TURN=8`, `loop.ts:12`) but **never enforced** — `collect()` throws on tool-calls, no execution loop
- ⚠️ "Verified vs Ollama" unevidenced — all `test` scripts are `echo "no tests yet"`

### Milestone 2 — NEXT (resume wiring + deterministic render, 6 tickets)
See `M2 tickets` below. Core: `resumes` tables, `resume.tailor` + `resume.render` handlers,
`ConfigurableLayout` 40-template port, Chromium PDF + docx export, REPL `/tailor /render`,
golden files, Cloud `string[]↔SkillEntry` bridge (`resumeBridge.ts` referenced but missing).

### Milestone 3 — Electron shell (not started)
- `apps/desktop/` dirs exist, zero files; all scripts are `echo` placeholders
- Needs: `main` (harness IPC, safeStorage keychain, sqlite path), `preload` bridge, `renderer` chat/sessions/preview
- Keychain: promised (`README:30`, `store.ts:27`) but zero code — keys still in plaintext dotenv

### Milestone 4+ — tools (descriptions only)
- `tools/registry.ts:161` defines 10 tools (jobs.search, email.*, tracker, verify) w/ `toolMilestone()` M4–M6 tags; `execute()` always throws "no implementation yet"

---

## Tech Stack Summary (amended)

| Layer | V1 | V2 |
|---|---|---|
| Frontend | React 19 + TS + Vite 8 | Electron (stub) |
| Backend | NestJS 11 + TS | Harness (UI-agnostic TS) |
| DB | MongoDB + Mongoose | better-sqlite3 local |
| Auth | Google OAuth + JWT + bcrypt email | OS keychain (planned) |
| Storage | Cloudinary (not R2) | Local FS + Chromium PDF |
| Crawler | Playwright | Tool descriptors only |
| AI | Ollama → OpenRouter → Groq | 5 adapters + router |
| Errors | Sentry server; client missing | — |

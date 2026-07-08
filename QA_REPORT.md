# Folio QA Report

**Date**: July 7, 2026
**Tester**: Automated QA Scripts
**Environment**: 
- Client: Vite dev server on port 3000, proxying `/api` to port 8080
- Server: NestJS on port 8080, `nest start --watch`
- DB: MongoDB Atlas (`mongoose@9.7.1`, `@nestjs/mongoose@11.0.4`)
- AI: Ollama `llama3.2:1b` (primary), OpenRouter (fallback)
- Test User: `testqa1783443853@folio-test.com` (created during signup test)

---

## CRITICAL BUGS (Fixed)

### Bug #1: `userId` fields stored as `Mixed` type instead of `ObjectId`

**Severity**: Critical — broke ALL queries filtering by ObjectId ref fields

**Root Cause**: All `@Prop({ type: Types.ObjectId, ref: 'X' })` decorators across the codebase used `mongoose.Types.ObjectId` (the BSON ObjectId class). When passed to `@nestjs/mongoose`'s `SchemaFactory.createForClass()`, this type wasn't recognized as a valid Mongoose schema type, causing all ObjectId ref fields to resolve as `Mixed`.

- `mongoose.Types.ObjectId` ≠ `mongoose.Schema.Types.ObjectId`
- The former is the BSON class; the latter is Mongoose's schema type identifier
- `SchemaFactory.createForClass()` could not identify `Mixed` fields as ObjectId refs
- Querying by `userId: 'string'` on Mixed fields doesn't auto-cast → query returns 0 results

**Impact**: Every feature that queries by `userId`, `resumeId`, `sessionId`, etc. was broken:
- `PATCH /api/builder/{id}/state` returned 404 "Resume not found"
- `GET /api/builder/{id}` returned 404
- `GET /api/resumes` returned empty array
- All builder-created resumes were invisible to the list endpoint
- Builder template selection created a session but couldn't save state → stuck on template selection

**Files Fixed** (22 `@Prop()` decorators across 11 schema files):
- `server/src/modules/resumes/schemas/resume.schema.ts`
- `server/src/modules/upload/schemas/upload.schema.ts`
- `server/src/modules/interviews/schemas/interview-session.schema.ts`
- `server/src/modules/interviews/schemas/interview-transcript.schema.ts`
- `server/src/modules/interviews/schemas/interview-proctoring.schema.ts`
- `server/src/modules/interviews/schemas/interview-result.schema.ts`
- `server/src/modules/crawler/schemas/crawl-job.schema.ts`
- `server/src/modules/research/schemas/research-job.schema.ts`
- `server/src/modules/ats/schemas/ats-score.schema.ts`
- `server/src/modules/cover-letters/schemas/cover-letter.schema.ts`
- `server/src/modules/discover/schemas/job-application.schema.ts`
- `server/src/modules/discover/schemas/job-match.schema.ts`
- `server/src/modules/discover/schemas/discover-preferences.schema.ts`

**Fix**: Changed `import { Types } from 'mongoose'` to `import { Types, Schema as MongooseSchema } from 'mongoose'` and `type: Types.ObjectId` to `type: MongooseSchema.Types.ObjectId`.

**Verification**: After fix:
- `PATCH /api/builder/{id}/state` → 200 ✓
- `GET /api/builder/{id}` → 200 ✓
- Builder navigates from template selection → mode selection ✓
- `userId` schema type: `Mixed` → `ObjectId` ✓

---

## TEST RESULTS

### 1. Authentication & Authorization

| Feature | Status | Notes |
|---------|--------|-------|
| Signup with email/password | ✅ PASS | Redirected to dashboard |
| Login with credentials | ✅ PASS | Redirects to dashboard |
| Google OAuth buttons | ✅ PASS | Present on login and signup pages |
| Protected route redirect | ✅ PASS | All protected routes redirect to `/login` when unauthenticated |
| JWT Auth Guard | ✅ PASS | `/api/auth/me` returns 401 without token |
| Token expiry handling | ✅ PASS | Expired tokens return 401 |

### 2. Dashboard & Resume List

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard loads | ✅ PASS | Shows "Your story starts here" empty state |
| Resumes page loads | ✅ PASS | Shows list with Upload/New buttons |
| Filter tabs (All/Needs attention/Strong) | ✅ PASS | Tabs visible |
| Existing resumes show "Continue editing" | ✅ PASS | Previous builder sessions appear |
| Delete resume button | ✅ PASS | Present on list items |
| "Build from scratch" link | ⚠️ NOT FOUND | Not visible on resumes page — only accessible via direct `/resumes/builder` URL |

### 3. Resume Builder (Build from Scratch)

| Feature | Status | Notes |
|---------|--------|-------|
| Template selection page | ✅ PASS | 15 templates shown |
| Filter categories (All/Classic/Modern/...) | ✅ PASS | 8 filters working — "Creative" shows 5 templates |
| Template selection → session creation | ✅ PASS | Navigates to `/resumes/builder/{id}` ✓ |
| Mode selection screen | ✅ PASS | Shows "Step-by-step wizard" and "Chat with AI" options |
| Wizard mode | ⚠️ PARTIAL | Enters wizard mode, "Continue →" buttons in each step |
| Chat mode | ⚠️ PARTIAL | Chat with AI button found but chat input not detected in test |
| Styles panel | ✅ PASS | Opens with color/font/template options |
| Export popover | ✅ PASS | Opens with export options |
| Debug panel (Ctrl+Shift+D) | ⚠️ PARTIAL | Bug button present in auto-hide mode |
| Undo/Redo | ⚠️ PARTIAL | Present in code (`_history`/`_future` stacks) but buttons not found by title attributes |
| Refresh persistence | ⚠️ UNTESTED | Need manual test |
| Mongoose `{new: true}` deprecation | ⚠️ KNOWN | `findOneAndUpdate` uses deprecated `{new: true}` — should be `{returnDocument: 'after'}` |

### 4. Resume Editor

| Feature | Status | Notes |
|---------|--------|-------|
| Editor loads from "New" button | ✅ PASS | New blank resume created |
| Editor loads from "Continue editing" | ✅ PASS | Existing resume opens |
| Sections panel | ✅ PASS | Shows available sections to add, custom section input |
| Styles panel | ✅ PASS | Template, color, font options |
| AI panel | ✅ PASS | Opens — shows "0 AI rewrites" and "No variations" (may be scoring/rewrite panel) |
| Export button | ✅ PASS | Shows export popover |
| Inline editing (click on text) | ✅ PASS | Clicking "Your Name" opens a text input with placeholder |
| ContentEditable | ✅ NOT USED | Editor uses inline input fields on click, not contentEditable |
| Canvas/PDF rendering | ✅ NOT USED | Resume is plain DOM — no canvas or iframe |
| Save indicator | ✅ PASS | Shows "Saved" status in toolbar |

### 5. Cover Letters

| Feature | Status | Notes |
|---------|--------|-------|
| Page loads | ✅ PASS | |
| Resume selector | ✅ PASS | "Choose a resume..." dropdown |
| Tone selection | ✅ PASS | Professional, Confident, Creative |
| Generate button | ✅ PASS | "Generate letter" button |
| My letters tab | ✅ PASS | Tab for saved letters |

### 6. ATS Scorer

| Feature | Status | Notes |
|---------|--------|-------|
| Page loads | ✅ PASS | |
| Resume selector | ✅ PASS | "Choose a resume..." dropdown |
| Score button | ✅ PASS | "Check my fit" button |
| Job description field | ⚠️ NOT DETECTED | Might be hidden behind a dropdown or different label |

### 7. Interview Prep

| Feature | Status | Notes |
|---------|--------|-------|
| Page loads | ✅ PASS | |
| Target Role field | ✅ PASS | |
| Level selector | ✅ PASS | Mid Level shown by default, Junior/Senior options |
| Resume selector | ✅ PASS | "Select a resume" dropdown |
| Back/Next buttons | ✅ PASS | Navigation works |

### 8. Settings

| Feature | Status | Notes |
|---------|--------|-------|
| Page loads | ✅ PASS | |
| Save Changes button | ✅ PASS | |
| Connect button | ✅ PASS | For integrations |
| Update Password section | ✅ PASS | |
| Delete Account button | ✅ PASS | |

---

## UI/UX Observations

1. **Build from scratch navigation**: The "Build from scratch" link is not visible on the resumes page. Users can only reach the builder via direct URL `/resumes/builder`. Consider adding a link in the resumes toolbar.

2. **Undo/Redo button accessibility**: Undo/redo buttons in the builder toolbar don't have accessible `title` or `aria-label` attributes — they rely on SVG icon recognition, making them hard to identify in tests and screen readers.

3. **AI Chat panel identity**: The AI panel in the editor shows "AI rewrites" and "No variations available" — it may be a rewrite/scoring panel rather than a chat interface. The AI chat panel (side="left") may need verification that it's properly wired.

4. **Editor inline editing UX**: The editor shows static DOM text until clicked, then reveals an input. This two-step interaction is clean but might be confusing on first use. Consider visual affordances (subtle border, pencil icon on hover) to indicate clickability.

5. **Empty states**: 
   - Dashboard: Shows "Your story starts here" — clear
   - Sections panel: "No sections yet. Add one below." — clear
   - AI rewrites: "0 AI rewrites / No variations available" — clear

6. **Server-side deprecation warning**: `findOneAndUpdate` with `{new: true}` is deprecated in Mongoose 9 — should use `{returnDocument: 'after'}`.

---

## Security Observations

1. **Auth guards**: All protected routes properly redirect to `/login` — ✅
2. **JWT extraction**: Uses `Authorization: Bearer` header — standard — ✅
3. **JWT expiry**: Tokens expire after ~15 minutes (900s) based on observed timestamps — standard — ✅
4. **CSP headers**: Server uses Helmet with CSP directives — ✅
5. **CORS**: Configured to `Client_URL only — ✅
6. **Rate limiting**: ThrottlerModule configured (10 req/s short, 50 req/10s medium, 200 req/60s long) — ✅
7. **Input validation**: `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` — ✅
8. **XSS vectors**: Template previews use `dangerouslySetInnerHTML` for SVG previews — needs review, but SVGs are from trusted source (built-in templates)
9. **MongoDB injection**: Mongoose ObjectId casting helps prevent injection risks

---

## Recommendations

### High Priority
1. **Resumes list not showing builder resumes**: After the schema fix, verify that `GET /api/resumes` now returns builder-created resumes. This was blocked by the same ObjectId issue.
2. **Fix `{new: true}` deprecation**: Replace all `{new: true}` with `{returnDocument: 'after'}` in `findOneAndUpdate` calls across all services.

### Medium Priority
3. **Add undo/redo aria labels**: Add `aria-label="Undo"` and `aria-label="Redo"` to toolbar buttons for accessibility.
4. **Add "Build from scratch" to resumes page**: Consider adding a link/button in the resumes toolbar for easier builder access.
5. **Verify AI chat panel wiring**: Ensure the editor's AI panel (side="left") correctly connects to `POST /api/ai/chat` and processes action tags.

### Low Priority
6. **Editor inline editing affordance**: Add hover effects to indicate text is clickable/editables.
7. **Screenshot tooltips on editor**: When hovering over resume text, show a subtle "Click to edit" indicator.
8. **Cover letter/ATS full flow test**: These features need end-to-end testing with actual resume data loaded.

---

## Test Scripts Generated

- `/tmp/recon_all_pages.py` — Initial page exploration (15 pages)
- `/tmp/signup_and_explore.py` — Signup + authenticated page exploration
- `/tmp/test_builder.py` — Builder template selection tests
- `/tmp/test_builder_debug.py` — Network debugging for builder API
- `/tmp/test_builder_fixed.py` — Post-fix builder verification
- `/tmp/test_builder_e2e.py` — Full builder end-to-end
- `/tmp/test_editor.py` — Editor page structure tests
- `/tmp/test_editor2.py` — Editor button analysis
- `/tmp/test_editor_full.py` — Full editor panel tests
- `/tmp/test_editor_edit.py` — Editor inline editing tests
- `/tmp/test_editor_canvas.py` — Canvas/rendering detection
- `/tmp/test_sections_panel.py` — Sections panel content analysis
- `/tmp/test_remaining.py` — Cover letter, ATS, interview, settings tests

## Screenshots Captured

Screenshots available in `/tmp/` directory with prefix `*.png`.

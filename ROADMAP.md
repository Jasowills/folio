# Folio Roadmap

## Phase 1 — Auth & User Foundation

**Goal**: Full sign-in/sign-up flow with Google OAuth, secure session management, and user profile management.

### Server
- [x] User schema (email, googleId, name, avatar, refreshTokenHash)
- [x] JWT auth module (15m access / 7d rotating refresh tokens)
- [x] Google token verification endpoint
- [x] Token refresh endpoint
- [x] Logout endpoint (invalidates refresh token)
- [ ] Rate limiting on auth routes
- [ ] Email/password auth as fallback (optional)

### Client
- [ ] Google One Tap / button login
- [ ] Auth context/provider wrapping the app
- [ ] Protected route wrapper component
- [ ] Token refresh interceptor (scaffolded, test end-to-end)
- [ ] Login page UI
- [ ] Logout button in nav

### Acceptance
- [ ] User can sign in with Google
- [ ] Access token auto-refreshes on 401
- [ ] Logout invalidates refresh token server-side

---

## Phase 2 — File Uploads

**Goal**: Users can upload PDF/DOCX resumes and documents via Cloudinary.

### Server
- [x] Upload endpoint with mime & size validation (5MB, PDF/DOCX)
- [ ] Multer configured for memory storage
- [ ] Cloudinary configuration (cloud name, API key, API secret)
- [ ] Upload metadata schema (userId, filename, key, uploadedAt)

### Client
- [ ] Upload page with drag-and-drop zone
- [ ] File type/size validation client-side (UX mirror)
- [ ] Upload progress indicator
- [ ] List of uploaded files per user
- [ ] Delete file endpoint & UI

### Acceptance
- [ ] User can upload a PDF < 5MB
- [ ] DOCX also accepted, other types rejected
- [ ] File lands in R2 bucket
- [ ] Upload history displayed on profile page

---

## Phase 3 — Portfolio Crawler

**Goal**: Users submit a URL; the server crawls it asynchronously, takes a screenshot, and returns an analysis.

### Server
- [x] Fire-and-forget analysis with job ID
- [x] Status polling endpoint
- [ ] Playwright integration (launch browser, navigate, screenshot)
- [ ] Screenshot upload to R2
- [ ] Analysis result schema (jobId, url, status, screenshotUrl, metadata)
- [ ] Proper cleanup (browser context disposal, error handling)

### Client
- [ ] URL input form with validation
- [ ] Analysis status polling (useEffect interval)
- [ ] Results display (screenshot, metadata, insights)
- [ ] Error state handling (invalid URL, timeout, crawl failure)

### Acceptance
- [ ] User submits a URL and gets back an `analysisId`
- [ ] Client polls and sees `pending` → `completed`
- [ ] Screenshot is served from R2
- [ ] Multiple concurrent analyses don't interfere

---

## Phase 4 — Dashboard & Results

**Goal**: Central dashboard showing all past analyses, with filtering, search, and detail views.

### Server
- [ ] GET /crawler/history — paginated list of user's analyses
- [ ] GET /crawler/:id — full analysis detail
- [ ] DELETE /crawler/:id — remove analysis + R2 screenshot

### Client
- [ ] Dashboard page with card/grid layout
- [ ] Loading skeleton states
- [ ] Empty state illustration ("No analyses yet")
- [ ] Search & filter by URL or date
- [ ] Detail page with full results + screenshot

### Acceptance
- [ ] Dashboard loads paginated history
- [ ] User can view any past analysis
- [ ] Deleting an analysis removes it from the list and from R2

---

## Phase 5 — Admin & Teams (Optional)

**Goal**: Multi-user workspace with role-based access.

- Team/workspace schema
- Invite flow (email + token)
- Role-based guards on endpoints (`admin`, `editor`, `viewer`)
- Shared analysis results within a team

---

## Phase 6 — Error Monitoring & Production Readiness

**Goal**: Ship with confidence — errors are tracked, performance is measured, infra is hardened.

### Client
- [ ] Sentry initialization (DSN provided in VITE_SENTRY_DSN)
- [ ] Source maps upload on build
- [ ] Error boundary component wrapping routes

### Server
- [ ] Structured logging (pino or nest-winston)
- [ ] Sentry integration for uncaught exceptions
- [ ] Helmet for security headers
- [ ] Compression middleware

### Infra
- [ ] Docker Compose for local dev (app + mongo)
- [ ] Production Dockerfile (multi-stage build)
- [ ] CI pipeline (lint → test → build)
- [ ] Environment variable validation at startup

### Acceptance
- [ ] Uncaught client errors appear in Sentry dashboard
- [ ] Server errors are logged with request context
- [ ] `npm run build` produces optimized artifacts
- [ ] App starts with missing env vars fails fast with clear message

---

## Phase 7 — Testing

### Server
- [ ] Unit tests for auth service (token generation, validation, refresh rotation)
- [ ] Unit tests for upload service (mime/size rejection logic)
- [ ] Unit tests for crawler service (job lifecycle)
- [ ] E2E test: auth → upload → crawl → results flow
- [ ] E2E test: error cases (invalid tokens, wrong file types, bad URLs)

### Client
- [ ] Component tests for login page, upload zone, dashboard
- [ ] Hook tests for useAuth, polling logic
- [ ] Mock service worker (MSW) for API mocking in tests

---

## Phase 8 — Polish & Launch

### UI/UX
- [ ] Loading states everywhere (skeletons, spinners)
- [ ] Error toasts / snackbars
- [ ] Empty states for all list views
- [ ] Responsive design audit (mobile + tablet + desktop)
- [ ] Keyboard navigation & focus management
- [ ] Dark mode toggle (optional)

### Launch
- [ ] Custom domain + SSL
- [ ] MongoDB Atlas (or your own Mongo instance)
- [ ] Cloudinary configured
- [ ] Sentry project created
- [ ] Google OAuth credentials (web + mobile if needed)
- [ ] CI/CD pipeline to deploy on merge to main

---

## Tech Stack Summary

| Layer        | Technology                           |
|--------------|--------------------------------------|
| Frontend     | React 19 + TypeScript + Vite         |
| Backend      | NestJS 11 + TypeScript               |
| Database     | MongoDB + Mongoose                   |
| Auth         | Google OAuth + JWT (access/refresh)  |
| File Storage | Cloudinary                            |
| Crawler      | Playwright                           |
| API Docs     | Swagger (dev only)                   |
| Error Mgmt   | Sentry                               |
| Monorepo     | npm workspaces + concurrently        |

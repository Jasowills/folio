# &Folio

AI-powered resume platform — upload, build, score, and interview-prep all in one place.

## Architecture

```
client/   — React 19 + Vite 8 + Tailwind v4 + Framer Motion
server/   — NestJS 11 + MongoDB + Ollama/OpenRouter AI
```

| Service | Port | Notes |
|---|---|---|
| Vite dev server | `3000` | Proxies `/api` → `8080` |
| NestJS API | `8080` | REST + WebSocket + Swagger at `/api/docs` |
| Ollama (optional) | `11434` | Primary AI provider |

## Getting started

```bash
npm install
cd client && npm install && cd ../server && npm install
cp server/.env.example server/.env     # add MONGODB_URI, JWT_SECRET, etc.
cp client/.env.example client/.env
npm run dev                            # runs both via concurrently
```

## Features

### Resume analysis
PDF/DOCX upload → text extraction → AI review with role detection, section scoring, red flags, suggestions, and ATS keyword matching. Guest reviews work without an account (shareable 6-hour TTL link).

### Resume builder
Two editors — a structured JSON editor (contact, summary, experience, education, skills, certifications, languages) and a PDF block editor. The AI wizard generates summaries, rewrites bullets, suggests skills, and guides you step-by-step via chat.

### Templates
50+ templates in three layout families (single-column, two-column, sidebar) with 15 color themes and style presets controlling headers, headings, bullets, fonts, and spacing.

### ATS scoring
Paste a job description (or URL) → AI scores your resume against it → keyword gap analysis → scoring history.

### Cover letters
Pick a resume + target role → AI generates a tailored cover letter via SSE streaming. Adjustable tone. History with view/delete.

### Portfolio analysis
Submit a personal website URL → Playwright crawls it → AI compares content against your resume.

### Interview prep
Configure role, level, company, tech stack → AI generates a structured question plan → live simulation via WebSocket with Deepgram speech-to-text + TTS voice synthesis. Includes live coding (Monaco editor, 13 languages via Piston API), proctoring (face/gaze tracking, tab-switch detection), barge-in, pause/resume, and company research scraping.

### Job discovery
Aggregated feed from 18 crawlers (LinkedIn, Greenhouse, Lever, Wellfound, YC, HN, RemoteOK, etc.). Save preferences, track applications with status/notes/checklist, hide irrelevant jobs.

### Company research
Scrape any company URL → extract mission, values, product focus, recent news, interview signals.

### Export
Resume PDF with template + color theme. Guest analysis report PDF.

## Tech stack

| Client | Server |
|---|---|
| React 19, Vite 8 | NestJS 11, TypeScript |
| Tailwind v4, Framer Motion | MongoDB + Mongoose |
| React Router 7, Zustand | JWT + bcrypt + Google OAuth |
| TanStack Query, Axios | Ollama → OpenRouter → Groq fallback |
| React Hook Form + Zod | Deepgram STT (Flux) + TTS |
| Three.js / R3F | Socket.IO WebSockets |
| Monaco editor | Playwright crawler |
| Radix UI primitives | Cloudinary storage |
| Tabler icons | Sentry, Helmet, rate limiting |

## Environment

| Variable | Where | Required |
|---|---|---|
| `MONGODB_URI` | server | Yes |
| `JWT_SECRET` | server | Yes |
| `OPENROUTER_API_KEY` | server | Fallback AI |
| `CLOUDINARY_URL` | server | Yes |
| `GOOGLE_CLIENT_ID` | server | Yes |
| `DEEPGRAM_API_KEY` | server | Voice features |
| `VITE_API_URL` | client | Yes |
| `VITE_GOOGLE_CLIENT_ID` | client | Google auth |

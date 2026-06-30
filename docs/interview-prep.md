# AI Interview Prep — Folio &

## Goal
A voice-based AI mock interview indistinguishable from a real interview. Three simultaneous AI perspectives: Interviewer (consistent persona), Company (researched), Resume (grounded).

## Stack
- **STT/TTS**: Deepgram (real-time WebSocket)
- **AI**: Ollama primary → OpenRouter fallback (same pattern as rest of app)
- **Face detection**: MediaPipe Face Mesh via TensorFlow.js (client-side, free)
- **Code execution**: Piston API (free, no key)
- **Avatar**: CSS gradient orb (pulses with TTS audio)

## Data Model
- `interview_sessions` — setup, persona, question plan, status, timing
- `interview_transcripts` — turns array, code submissions
- `interview_proctoring` — events array, integrity score
- `interview_results` — scores, feedback, next steps

## Routes
| Path | Page | Auth |
|------|------|------|
| `/interview/new` | Setup wizard (5 steps) | Required |
| `/interview/new/prep` | Preparation brief | Required |
| `/interview/:sessionId/live` | Real-time session | Required |
| `/interview/:sessionId/results` | Scoring + transcript | Required |

## Build Order

### Phase 1 — Data Model + Server Module
- [x] Schemas: `InterviewSession`, `InterviewTranscript`, `InterviewProctoring`, `InterviewResult`
- [x] `interviews.module.ts` — register schemas, imports, providers
- [x] `interviews.service.ts` — CRUD, session lifecycle, persona gen, scoring
- [x] `interviews.gateway.ts` — WebSocket gateway (socket.io stub)
- [x] `interviews.controller.ts` — REST endpoints (CRUD, persona, start/end)
- [x] Register in `app.module.ts`

### Phase 2 — AI Pipeline
- [x] Persona generation prompt (`PERSONA_GENERATION_SYSTEM`)
- [x] Interview response prompt (`INTERVIEW_RESPONSE_SYSTEM`)
- [x] Interview scoring prompt (`INTERVIEW_SCORING_SYSTEM`)
- [x] Company research service (Playwright crawl, on createSession)
- [x] Wire into AiService pattern (via `chat()` call)

### Phase 3 — Setup Wizard (`/interview/new`)
- [x] 5-step form: role → company → tech config → duration → review
- [x] Resume selector wired to user's resumes
- [x] Company URL input with research notice
- [x] Prep brief page (`/interview/new/prep`)

### Phase 4 — Real-Time Session (`/interview/:sessionId/live`)
- [x] Deepgram WebSocket integration (streaming STT via listen.v1, TTS via REST)
- [x] Camera feed + gradient orb avatar with pulse animation (tied to TTS)
- [x] Turn state machine + captions + mic indicator
- [x] Pause system (max 2 pauses, 2 min each, enforced server-side)
- [x] Monaco Editor (coding phases)
- [x] Proctoring (MediaPipe Face Mesh via @mediapipe/tasks-vision, Page Visibility, paste detection, window blur)
- [x] Code execution via Piston API (free, no key required)

### Phase 5 — Results Page (`/interview/:sessionId/results`)
- [x] Overall score ring + dimension scores
- [x] Interactive transcript with speaker bubbles
- [x] Proctoring summary (educational framing)
- [x] Next-steps action cards

## Service Choices
- STT: Deepgram (real-time WebSocket)
- TTS: Deepgram (real-time)
- Code execution: Piston API (free, no key)
- Face detection: MediaPipe Face Mesh (client-side)

## Environment Variables Needed
- `DEEPGRAM_API_KEY` — Deepgram API key for STT/TTS
- `OPENAI_API_KEY` — (if using Whisper as fallback)

## Notes
- Proctoring is educational — "here's what a real interview platform might flag"
- All questions must be traceable to role, company, or resume content
- Persona stays consistent for entire session
- Question plan generated upfront for intentional pacing

# Folio v2

Local-first agentic job-hunting harness + Electron desktop client (spec: `../SPEC_FOLIO_V2.md` — see repo root).

## Layout

```
apps/desktop/          Electron shell (Milestone 3)
packages/harness/      core agent loop, model-agnostic (Milestone 1 ✅)
packages/resume-schema/ canonical resume JSON + zod (Milestone 1 ✅, wired in M2)
packages/resume-render/ deterministic PDF/DOCX renderer (stub ✅, full port in M2)
packages/shared-types/ cross-package TS types (✅)
```

## Quickstart (Milestone 1)

```bash
cd folio-v2
pnpm install
cp .env.example .env   # Ollama default; add API keys as needed
pnpm harness:dev       # terminal REPL — no Electron required
```

REPL commands: `/providers` `/use <id>` `/new` `/sessions` `/resume <id>`
`/tools` `/structured` (zod repair-loop smoke test) `/log` `/quit`.

## Design rules

- Harness is UI-agnostic: no Electron IPC / React imports in `packages/harness`.
- Secrets (API keys, OAuth tokens) → OS keychain only, never SQLite.
- Nothing leaves the machine except model-API calls and public web/email-provider calls.

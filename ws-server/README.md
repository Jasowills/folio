# Folio WebSocket Server (Interview Gateway)

This is a standalone Socket.IO server for the interview feature.
Deploy to Railway, Render, or Fly.io — anywhere that supports WebSockets and long-running processes.

## Why separate?

Vercel serverless doesn't support WebSocket upgrades. The interview feature requires:
- Persistent Socket.IO connections (30+ minute sessions)
- Deepgram real-time STT WebSocket connections
- In-memory session state across the session lifetime

## Setup

1. Copy the `server/` directory from the main Folio project
2. Install dependencies: `npm install`
3. Set environment variables (same as main server)
4. Run: `npm run start:prod`

## Environment Variables

All variables from the main server's `.env` are needed, plus:
- `WS_PORT` — Port for the WebSocket server (default: 8081)
- `CORS_ORIGIN` — Allowed CORS origin (your Vercel frontend URL)

## Deployment

### Railway
```bash
railway init
railway add
railway deploy
```

### Render
- Create a new Web Service
- Connect your repo
- Set build command: `cd ws-server && npm install && npm run build`
- Set start command: `cd ws-server && npm run start`

## Client Connection

The frontend connects to this server directly:
```typescript
import { io } from 'socket.io-client'
const ws = io('wss://your-ws-server.railway.app/interview', {
  auth: { token: localStorage.getItem('accessToken') }
})
```

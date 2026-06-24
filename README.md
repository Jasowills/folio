# &Folio

AI-powered resume analysis. Upload a PDF or DOCX, get a detailed review with scores, red flags, section-by-section feedback, ATS keyword matching, and actionable next steps.

## Structure

```
client/   — React + Vite + Tailwind v4 + Framer Motion
server/   — NestJS + MongoDB + OpenRouter AI
```

## Getting started

```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Set up environment
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit .env files with your keys

# Run (from root — runs both with concurrently)
npm run dev
```

- **Client**: `http://localhost:5173`
- **Server**: `http://localhost:3000`

## Environment

| Variable | Where | Required |
|---|---|---|
| `MONGODB_URI` | server | Yes |
| `JWT_SECRET` | server | Yes |
| `OPENROUTER_API_KEY` | server | Yes |
| `CLOUDINARY_URL` | server | Yes |
| `GOOGLE_CLIENT_ID` | server | Yes |
| `VITE_API_URL` | client | Yes |

## Features

- PDF/DOCX parsing with text extraction
- AI-powered resume analysis (role detection, scoring, red flags, suggestions)
- Resume builder with templates
- ATS keyword scoring against job descriptions
- Cover letter generation
- Portfolio crawling and analysis
- Guest reviews (no account required, 6-hour TTL)
- Export to PDF
- Google OAuth + email/password auth

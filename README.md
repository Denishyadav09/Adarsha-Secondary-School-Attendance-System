# Adarsha School Attendance

QR Code-based attendance management system for Adarsha School.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploying to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Set the following environment variable in Vercel dashboard:
   - `GEMINI_API_KEY` — your Google Gemini API key (for AI Guide feature)
4. Click **Deploy**

Vercel will automatically:
- Run `npm run build` (Vite build)
- Serve the frontend from `dist/`
- Handle `/api/ai-guide` via the serverless function in `api/`

## Features

- QR Code scanning for student attendance
- Manual check-in
- Attendance reports & CSV export
- AI Guide assistant (in Nepali)
- Nepali date (BS) support

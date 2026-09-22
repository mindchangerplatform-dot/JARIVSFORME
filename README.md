# JARVISFORME

Personal AI JEE Mentor — dashboard foundation.

## Stack
- Next.js + React + TypeScript
- Supabase for authentication/data
- OpenAI for the mentor/planner brain
- ElevenLabs for voice

## Run locally
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and add your keys.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open http://localhost:3000

## Current foundation
The dashboard is live as a UI foundation with daily plan, progress metrics, backlog, streak and mentor check-in. The next implementation layer is real Supabase auth/data persistence, followed by the AI mentor and automatic planner APIs.
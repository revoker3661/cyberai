# CyberAI — Gamified Cybersecurity Training Platform

A gamified cybersecurity awareness training platform built for a hiring assessment. Users complete 8 training modules (lesson → quiz), earn points, level up, collect badges, and unlock a certificate.

## Live Demo

> **Demo credentials**: `demo@cyberai.app` / `CyberAI@Demo2024!`

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Server Components by default, type safety |
| Styling | Tailwind CSS | Maps 1:1 to wireframe designs |
| Auth + DB | Supabase (email/password + Postgres) | Free tier, built-in RLS |
| AI | Vercel AI SDK + Groq (primary) → Gemini Flash (fallback) | Free tier, provider-agnostic |
| Theme | next-themes | Light/dark per wireframe |
| Icons | lucide-react | Matches wireframe icon style |
| Deploy | Vercel | Zero-config Next.js deploy |

## Setup

```bash
git clone <repo>
cd cyberai
npm install
cp .env.example .env.local
# Fill in your Supabase and AI API keys
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=      # From Supabase dashboard → API settings
NEXT_PUBLIC_SUPABASE_ANON_KEY= # From Supabase dashboard → API settings
SUPABASE_SERVICE_ROLE_KEY=     # From Supabase dashboard → API settings (server-only)
GROQ_API_KEY=                  # Free at console.groq.com
GOOGLE_GENERATIVE_AI_API_KEY=  # Free at aistudio.google.com
```

### Supabase Setup

1. Create a Supabase project
2. Run `supabase/migrations/001_initial.sql` in the SQL editor
3. Enable email auth in Authentication settings

## Project Structure

```
app/
  (auth)/login, (auth)/signup   ← Email auth pages
  (app)/dashboard               ← Hero + progress + module grid
  (app)/modules/[id]/lesson     ← Lesson content + tutor chat
  (app)/modules/[id]/quiz       ← Quiz engine with confidence
  (app)/modules/[id]/review     ← Read-only quiz replay
  (app)/badges                  ← Badge collection + share
  (app)/certificate             ← Unlockable certificate
  (app)/cheat-sheet             ← Module takeaways
  (app)/profile                 ← Stats summary
  api/ai/{coach,tutor,phishing-sim,practice}/  ← AI endpoints
lib/
  content.ts / content.json     ← All lesson/quiz content (source of truth)
  game.ts                       ← Pure functions: level, attainment, progress
  supabase/                     ← Server + browser clients
  ai/                           ← Provider client, rate limit, zod schemas
```

## AI Features

See [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) for the full architecture.

- **Smart Quiz Coach** (P0a): Classifies answers as blind spots / lucky guesses / known gaps based on confidence data. Generates a "Cognitive Security Report" after each quiz.
- **Ask CyberAI Tutor** (P0b): Floating chat on lesson pages. Answers only about the current lesson. Groq→Gemini fallback, rate-limited.
- **Phishing Simulator** (P1): AI generates a fake phishing email with embedded red flags. User clicks suspicious parts; graded locally against returned flag IDs.
- **Adaptive Practice** (P2): After quiz, generates 3 new MCQs targeting missed concepts.

## Key Engineering Decisions

### 750 vs 800 points — Crypto module inconsistency
The wireframe for the crypto module advertises 800 total points, but the visible question breakdown sums to 750 (3×250). Dashboard math `4350/5100 = 85%` only works if crypto = 800. **Resolution**: `crypto-q3 = 300 pts`. Documented in `content.json`.

### Level titles Lv1–Lv3 inferred
Wireframes only show Lv4 ("Security Architect") and Lv5 ("Cyber Sentinel"). Levels 1–3 titles are inferred and noted in `content.json`.

### Confidence bonus scoring (1.25×)
Correct + Confident answers earn 25% extra points (e.g. 36 pts base → 45 pts). Correct + Guessing earns base points. Wrong answers show the missed points as a negative (e.g. `-36 pts`) for clear feedback. The `CONFIDENCE_BONUS_MULTIPLIER = 1.25` is applied server-side in `save-progress` — never trusted from the client. Confidence data also feeds the AI Smart Quiz Coach for richer "blind spot" analysis.

### Retake keeps best score
Re-taking a quiz only saves if the new score is higher or the previous attempt failed. A passed score is never downgraded. Keeps the data model simple while preserving achievement integrity.

### 240-question bank with anti-cheat shuffle
Each module has 30 questions. Each attempt Fisher-Yates shuffles the pool and serves 15. Option order is also shuffled per question. The server stores served question IDs + option order map and recomputes correctness by text identity — a client cannot forge a `selectedIndex` to fabricate a correct answer.

### Learn tab (creative addition beyond wireframes)
A `/learn` route was added that isn't in the wireframes. It presents a Coursera-style two-column layout: left panel lists all 8 modules with progress indicators; right panel renders the selected module's full lesson content. Lets users review material without re-entering the quiz flow.

### Static question bank + AI overlay
Quiz questions are from `content.json` (deterministic). AI adds coaching, personalization, and practice on top — never replaces core content. Prevents hallucinated security advice and ensures wireframe fidelity.

## Security Notes

- All API keys are server-side only (never sent to client)
- Supabase RLS on all tables — users can only access their own rows
- Server-side score recomputation on every quiz submit
- zod validation on all API inputs and AI outputs
- Rate limiting: 20 AI calls/hour/endpoint per user
- AI text rendered as plain text (no `dangerouslySetInnerHTML`)

## How I Used Claude Code

See [docs/prompts-log.md](docs/prompts-log.md) for the full AI-assisted workflow log.

Key practices:
- Studied all 39 wireframe PNGs before writing any UI code
- Plan Mode for multi-file tasks (quiz engine, AI layer)
- One significant feature = one Claude Code prompt + one commit
- Self-correction: "Compare implementation against wireframe and list every visual difference"
- Game math assertions embedded in `lib/game.ts` — wireframe numbers ARE the tests

## Commands

```bash
npm run dev    # Local development
npm run build  # Production build (zero TS errors required)
npm run lint   # ESLint check
```

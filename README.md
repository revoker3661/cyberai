# CyberAI — Gamified Cybersecurity Training Platform

A gamified cybersecurity awareness training platform built for a hiring assessment (Group SNS, June 2026). Users complete 8 training modules (lesson → quiz), earn points with a confidence-weighted scoring system, level up, collect badges, and unlock a shareable certificate.

## Live Demo

> **URL**: *(Vercel deployment link — add after deploy)*
> **Demo credentials**: `demo@cyberai.app` / `CyberAI@Demo2024!`

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict | Server Components by default, zero-config Vercel deploy |
| Styling | Tailwind CSS | Utility-first, maps 1:1 to wireframe designs |
| Auth + DB | Supabase (email/password + Postgres) | Free tier, built-in RLS, SSR-compatible client |
| AI | Vercel AI SDK + Groq primary → Gemini Flash fallback | Free tier, provider-agnostic, 4-attempt fallback chain |
| Theme | next-themes | Light/dark per wireframe spec |
| Icons | lucide-react | Matches wireframe icon vocabulary |
| Validation | zod | All API inputs + AI outputs validated at boundary |
| Deploy | Vercel | Zero-config Next.js deploy |

---

## Setup

```bash
git clone https://github.com/revoker3661/cyberai.git
cd cyberai
npm install
cp .env.example .env.local
# Fill in .env.local with your keys (see below)
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=      # Supabase dashboard → API settings
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase dashboard → API settings
SUPABASE_SERVICE_ROLE_KEY=     # Supabase dashboard → API settings (server-only)
GROQ_API_KEY=                  # Free at console.groq.com
GOOGLE_GENERATIVE_AI_API_KEY=  # Free at aistudio.google.com
```

### Supabase Setup

1. Create a Supabase project
2. Run `supabase/migrations/001_initial.sql` in the SQL editor
3. Run `supabase/migrations/002_scoring_and_learn.sql` (adds `passed`, `max_served_points`, `served_question_ids`, `option_orders` columns)
4. Enable email auth in Authentication → Providers

---

## Project Structure

```
app/
  (auth)/login                  ← Email login page
  (auth)/signup                 ← Signup with display_name
  (app)/dashboard               ← Hero banner, progress stats, 8-module grid
  (app)/learn                   ← Coursera-style module browser (creative addition)
  (app)/learn/[moduleId]        ← Inline lesson panel for selected module
  (app)/modules/[id]/lesson     ← Full lesson content + tutor button
  (app)/modules/[id]/quiz       ← Quiz engine (ssr:false via QuizClientWrapper)
  (app)/modules/[id]/review     ← Read-only quiz replay with stored answers
  (app)/badges                  ← Badge grid — passed modules only, canvas share image
  (app)/certificate             ← Unlockable certificate (all 8 passed)
  (app)/cheat-sheet             ← Passed-module takeaways only
  (app)/profile                 ← Stats: passed count, total pts, level, attainment
  api/ai/coach/                 ← Smart Quiz Coach (Cognitive Security Report)
  api/ai/tutor/                 ← Lesson-scoped floating tutor
  api/ai/assistant/             ← Floating AI Assistant (page-aware, multi-turn)
  api/ai/phishing-sim/          ← Phishing email simulator
  api/ai/practice/              ← Adaptive practice MCQ generator

components/
  shell/Sidebar.tsx             ← Always-dark sidebar, collapsible
  shell/MobileNav.tsx           ← Hamburger slide-over drawer
  quiz/QuizEngine.tsx           ← Full quiz + results + coach panel
  quiz/QuizClientWrapper.tsx    ← ssr:false wrapper to fix hydration mismatch
  ai/FloatingAssistant.tsx      ← Page-aware floating chat (hidden on quiz pages)
  ui/ShareButton.tsx            ← Canvas badge image generator + Web Share API
  ui/CertificateView.tsx        ← Ornate certificate with download/print/share

lib/
  content.ts / content.json    ← ALL lesson/quiz/cheatsheet content (source of truth)
  question-bank.json           ← 240 questions (30 per module)
  learning-content.json        ← Structured lesson content for FloatingAssistant
  game.ts                      ← Pure functions: scoring, level, attainment, shuffle
  supabase/server.ts           ← SSR Supabase client
  supabase/browser.ts          ← Client-side Supabase client
  ai/client.ts                 ← Groq→Gemini 4-attempt fallback, chat + object generation

docs/
  SPEC.md                      ← Original wireframe spec (source of truth)
  AI_ARCHITECTURE.md           ← Full AI feature architecture
  PROJECT.md                   ← Comprehensive project documentation (this codebase)
  prompts-log.md               ← AI-assisted workflow log (assessment requirement)

supabase/migrations/
  001_initial.sql              ← Core tables, RLS policies
  002_scoring_and_learn.sql    ← Scoring columns + lesson_progress table
```

---

## AI Features

See [docs/AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md) and [docs/PROJECT.md](docs/PROJECT.md) for full architecture.

### Floating AI Assistant (page-aware, conversational)
A persistent chat button visible on all pages **except quiz** (disabled to prevent mid-assessment coaching). Key capabilities:
- **Page context**: On `/learn/[moduleId]` pages, the assistant reads the full lesson content from `learning-content.json` and injects it into the system prompt — so asking "what is phishing?" on the phishing lesson gets a lesson-specific answer, not a generic one.
- **20-turn conversation history**: Full chat history is passed as native `messages[]` array to the AI (not serialized text), giving the model true conversational context.
- **Human personality**: Expressive system prompt with friendly language, varied responses, no word caps.
- **4-attempt fallback**: Groq structured → Gemini structured → Groq text+JSON → Gemini text+JSON.

### Smart Quiz Coach — Cognitive Security Report (P0a)
After every quiz, classifies your answers into:
- **Blind Spots** (confident + wrong) — highest priority; incorrect mental model
- **Lucky Guesses** (guessing + correct) — user doesn't know *why* they're right
- **Known Gaps** (guessing + wrong) — aware of ignorance, easier to fix

Generates a personalised "Cognitive Security Report" with summary + top recommendations. Confidence data from the quiz feeds directly into this analysis.

### Lesson Tutor (P0b)
Floating chat on lesson pages. Restricted to lesson content only — refuses off-topic questions. 120-word response cap to stay scannable.

### Phishing Simulator (P1)
AI generates a fake phishing email with embedded red flags (fictional brands, no real URLs). User identifies suspicious parts; graded locally against the returned `redFlags[]` array.

### Adaptive Practice (P2)
After quiz, sends wrong-answer topics to AI, receives 3 new MCQs targeting exactly those weaknesses. Unscored — purely for learning reinforcement.

---

## Scoring System

| Scenario | Points |
|---|---|
| Correct + Confident | `+Math.round(pts × 1.25)` — 25% confidence bonus |
| Correct + Guessing | `+pts` — base points |
| Wrong + Confident | `−Math.round(pts × 0.20)` — 20% overconfidence penalty |
| Wrong + Guessing | `0` — no penalty (you knew you were guessing) |

- Points are recomputed **server-side** on every submit — the client score is never trusted
- `CONFIDENCE_BONUS_MULTIPLIER = 1.25` and `CONFIDENT_WRONG_PENALTY = 0.20` in `lib/game.ts`
- Results screen shows: `baseScore / maxServedPoints pts` + `+N confidence bonus 🎯` + `−N overconfidence penalty`
- Per-question review shows exact earned/lost pts in green/red
- **Pass threshold**: ≥70% of `maxServedPoints` (base points only, no confidence inflation)

---

## Key Engineering Decisions

### 240-question bank with anti-cheat shuffle
Each module has 30 questions in `question-bank.json`. Per attempt: Fisher-Yates shuffles the pool, serves 15, and shuffles each question's option order. The server stores `servedQuestionIds` + `optionOrders` (a map of questionId → shuffled option text array). Correctness is verified by **text identity** — the `selectedIndex` is meaningless without the original option order, so a client cannot fabricate a correct answer by manipulating the index.

### Quiz renders client-only (no SSR)
`Math.random()` inside `buildServedQuestions()` runs on both server and client during Next.js hydration, producing different question orders → React hydration mismatch error. Fixed with `QuizClientWrapper` which uses `dynamic(..., { ssr: false })`. The wrapper must be a `"use client"` component because `ssr: false` is not allowed in Server Components.

### Passed-only gating
Badges, Cheat Sheet, and Profile "Modules Completed" counter all filter by `passed = true`. Attempting a quiz but failing does not unlock any rewards — only passing (≥70%) unlocks the badge, cheat sheet, and certificate progress.

### Retake keeps best score
`save-progress` upserts only when `score > existing.score OR NOT existing.passed`. A passing score is never overwritten by a lower score.

### Learn tab (beyond wireframes)
`/learn` is a Coursera-style two-column layout (module list left, lesson content right) not in the wireframes. Added as a creative enhancement — lets users review all 8 module lessons without re-entering the quiz flow.

### Badge canvas image
`ShareButton` uses the Canvas API to draw a professional badge image (accent-colored banner, shield emoji, module title, "Awarded to: [Name]", date, CyberAI branding) client-side. Shared via Web Share API with file support; falls back to text-only share, then clipboard copy.

### 750 vs 800 pts — Crypto module wireframe inconsistency
The crypto wireframe shows 800 pts total but question breakdown sums to 750. `4350/5100 = 85%` only works if crypto = 800. Resolution: `crypto-q3 = 300 pts`. Documented in `content.json`.

### Static question bank + AI overlay
Quiz questions are from `content.json` (deterministic, auditable). AI adds coaching, personalization, and practice on top — never replaces core content. Prevents hallucinated security advice and ensures wireframe fidelity.

---

## Security

- All API keys are server-side only (`GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Supabase RLS on every table — users can only read/write their own rows
- Server-side score recomputation on every quiz submit (never trust client score)
- zod validation on all API inputs and AI outputs
- Rate limiting: 20 AI calls/hour/endpoint per user (via `ai_usage` table)
- AI responses rendered as plain text/markdown — never `dangerouslySetInnerHTML`
- FloatingAssistant disabled on quiz pages — cannot be used to cheat during assessment

---

## How I Used Claude Code

See [docs/prompts-log.md](docs/prompts-log.md) for the full AI-assisted workflow log (20 prompts).

Key practices:
- Studied all 39 wireframe PNGs before writing any UI code
- Used Plan Mode for multi-file tasks (quiz engine, AI layer, scoring system)
- One significant feature = one Claude Code prompt + one commit
- Self-correction loop: "Compare implementation against wireframe and list every visual difference"
- Game math assertions embedded in `lib/game.ts` — wireframe numbers ARE the unit tests
- Confidence scoring designed iteratively: captured input → feeds AI coach → affects score → penalty for overconfidence

---

## Commands

```bash
npm run dev    # Local development (http://localhost:3000)
npm run build  # Production build — must pass with zero TypeScript errors
npm run lint   # ESLint check — must pass before commit
```

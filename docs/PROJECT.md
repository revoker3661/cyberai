# CyberAI — Complete Project Documentation

> This document is the single comprehensive reference for the CyberAI codebase. It covers architecture, every system, every design decision, and every file. Intended for technical evaluators and future contributors.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Game Mechanics & Scoring](#5-game-mechanics--scoring)
6. [Quiz Engine](#6-quiz-engine)
7. [AI System Architecture](#7-ai-system-architecture)
8. [Floating AI Assistant](#8-floating-ai-assistant)
9. [Learn Module](#9-learn-module)
10. [Badge & Reward System](#10-badge--reward-system)
11. [Certificate System](#11-certificate-system)
12. [Security Model](#12-security-model)
13. [UI & Accessibility](#13-ui--accessibility)
14. [Key Engineering Decisions](#14-key-engineering-decisions)

---

## 1. Project Overview

CyberAI is a gamified cybersecurity awareness training platform. The core loop is:

```
Read Lesson → Take Quiz (15 questions) → See Score + AI Coach Report → Earn Badge → Repeat
```

### 8 Training Modules

| Module | Max Points | Topics |
|---|---|---|
| Phishing: The Lure (Email) | 500 | Email spoofing, red flags, link inspection |
| The Strong Vault: Passwords & 2FA | 550 | Password managers, passphrases, 2FA types |
| Malware & Ransomware Defense | 650 | Malware types, infection vectors, backups |
| Vishing & Smishing (Non-Email) | 550 | Phone/SMS scams, social engineering |
| Physical, Travel & Remote Security | 600 | Shoulder surfing, VPN, public Wi-Fi |
| Data Handling, Reporting & Compliance | 700 | GDPR, data classification, incident reporting |
| Social Engineering & Modern Scams | 750 | Pretexting, baiting, insider threats |
| Financial & Cryptocurrency Scams | 800 | Crypto fraud, investment scams, rug pulls |

**Total max score**: 5,100 pts across all 8 modules.

### User Journey
1. Sign up with display name + email + password
2. Dashboard shows 8 module cards with color-coded states
3. Click a module → Start Lesson (read content) → Start Quiz (15 random questions)
4. Quiz captures both answer and confidence level per question
5. Submit → Server recomputes score with confidence multipliers → Save to DB
6. Results screen: score ring, per-question breakdown, AI Cognitive Security Report
7. Pass (≥70%) → badge unlocked, cheat sheet updated, certificate progress advances
8. Complete all 8 → Certificate of Completion generated with unique CERT-ID

---

## 2. Tech Stack

### Core Framework
- **Next.js 16.2.9** with App Router — Server Components by default, nested layouts, route groups `(auth)` and `(app)`
- **TypeScript strict mode** — `"strict": true` in tsconfig, zero `any` in production code
- **Tailwind CSS** — utility-first styling matching wireframe designs exactly

### Backend / Data
- **Supabase** — Postgres database + Auth + Row Level Security
  - Server client: `@supabase/ssr` with cookie-based session (works in RSC and API routes)
  - Browser client: singleton pattern to prevent multiple GoTrue instances
  - All tables have RLS policies — users can only access their own rows

### AI / LLM
- **Vercel AI SDK** (`ai` package) — provider-agnostic streaming and object generation
- **Groq** (`@ai-sdk/groq`) — primary provider, `llama-3.3-70b-versatile`, free tier (14,400 req/day)
- **Google Gemini** (`@ai-sdk/google`) — fallback provider, `gemini-1.5-flash`, free tier (1,500 req/day)
- **4-attempt fallback chain**: Groq structured → Gemini structured → Groq text+JSON parse → Gemini text+JSON parse
- **zod** — validates all AI outputs, retries on parse failure

### Validation & State
- **zod** — runtime validation on all API inputs and AI outputs
- React `useState` + `useCallback` — local UI state in client components

### Deployment
- **Vercel** — automatic deploy from GitHub `main` branch
- `NEXT_PUBLIC_*` env vars for client, all others server-only

---

## 3. Repository Structure

```
cyberai/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          Server Component — renders login form
│   │   └── signup/page.tsx         Client Component — signup with display_name
│   ├── (app)/
│   │   ├── layout.tsx              (app) group layout — renders Sidebar + FloatingAssistant
│   │   ├── dashboard/page.tsx      Server Component — progress stats + module grid
│   │   ├── learn/
│   │   │   ├── page.tsx            Server Component — module list for learn browser
│   │   │   └── [moduleId]/page.tsx Server Component — renders LearnPlayer for module
│   │   ├── modules/[id]/
│   │   │   ├── lesson/page.tsx     Server Component — full lesson content
│   │   │   ├── quiz/page.tsx       Server Component — renders QuizClientWrapper
│   │   │   └── review/page.tsx     Server Component — read-only quiz replay
│   │   ├── badges/page.tsx         Server Component — passed-only badge grid
│   │   ├── certificate/page.tsx    Server Component — locked/unlocked certificate
│   │   ├── cheat-sheet/page.tsx    Server Component — passed-only cheat sheet
│   │   └── profile/page.tsx        Server Component — training stats
│   ├── api/
│   │   ├── ai/
│   │   │   ├── coach/route.ts      POST — Cognitive Security Report
│   │   │   ├── tutor/route.ts      POST — Lesson-scoped tutor chat
│   │   │   ├── assistant/route.ts  POST — Page-aware floating assistant
│   │   │   ├── phishing-sim/route.ts  POST — Phishing email generator
│   │   │   └── practice/route.ts   POST — Adaptive practice MCQs
│   │   └── save-progress/route.ts  POST — Server-side score computation + upsert
│   ├── actions/
│   │   └── lesson.ts               Server Actions — lesson progress tracking
│   ├── globals.css                 Base styles
│   └── layout.tsx                  Root layout — html/body + ThemeProvider
│
├── components/
│   ├── shell/
│   │   ├── Sidebar.tsx             Always-dark collapsible sidebar
│   │   └── MobileNav.tsx           Hamburger slide-over drawer
│   ├── quiz/
│   │   ├── QuizEngine.tsx          Core quiz state machine + results screen
│   │   └── QuizClientWrapper.tsx   ssr:false wrapper for hydration fix
│   ├── learn/
│   │   └── LearnPlayer.tsx         Two-column learn layout (module list + lesson panel)
│   ├── ai/
│   │   └── FloatingAssistant.tsx   Persistent floating chat widget
│   ├── dashboard/                  Dashboard-specific components
│   └── ui/
│       ├── ShareButton.tsx         Canvas badge generator + Web Share API
│       ├── CertificateView.tsx     Ornate certificate with download/print
│       ├── CircularGauge.tsx       SVG score attainment gauge
│       ├── PrintButton.tsx         window.print() trigger
│       └── ThemeProvider.tsx       next-themes wrapper
│
├── lib/
│   ├── content.ts                  TypeScript types + exports from content.json
│   ├── content.json                ALL lesson text, cheat sheets (source of truth)
│   ├── question-bank.json          240 quiz questions (30 per module)
│   ├── learning-content.json       Structured lesson content for FloatingAssistant
│   ├── game.ts                     Pure functions: scoring, level, progress, shuffle
│   ├── supabase/
│   │   ├── server.ts               createClient() for Server Components + API routes
│   │   └── browser.ts              createClient() singleton for client components
│   └── ai/
│       └── client.ts               generateAIText, generateAIObject, generateChat
│
├── supabase/migrations/
│   ├── 001_initial.sql             Core tables + RLS policies
│   └── 002_scoring_and_learn.sql   passed, max_served_points, served_question_ids, option_orders
│
├── docs/
│   ├── SPEC.md                     Original wireframe specification
│   ├── AI_ARCHITECTURE.md          AI feature architecture
│   ├── PROJECT.md                  This document
│   └── prompts-log.md              AI-assisted workflow log
│
├── middleware.ts                   Protect (app) routes — redirect to /login if no session
├── .env.example                    Template for required environment variables
└── CLAUDE.md                       Claude Code project instructions
```

---

## 4. Database Schema

### `module_progress`
Stores one row per user per module (upserted — best score kept).

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `user_id` | uuid FK | References auth.users |
| `module_id` | text | Module slug (e.g. "phishing") |
| `score` | integer | Actual score earned (includes confidence multipliers) |
| `max_score` | integer | Module's total max points (from content.json) |
| `max_served_points` | integer | Sum of allocatedPoints for the 15 served questions |
| `passed` | boolean | score >= 0.70 × max_served_points |
| `answers` | jsonb | Array of `{questionId, selectedIndex, correct, confidence, topic, chosenText, correctText}` |
| `served_question_ids` | jsonb | Array of question IDs served in this attempt |
| `option_orders` | jsonb | Map of `{questionId: [shuffled option texts]}` for anti-cheat verification |
| `completed_at` | timestamptz | Timestamp of last attempt |

**RLS**: Users can only SELECT/INSERT/UPDATE their own rows (`user_id = auth.uid()`).

### `certificates`
One row per user (generated when all 8 modules passed).

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `user_id` | uuid FK | References auth.users |
| `cert_id` | text | Unique ID like "CERT-A7B3X9KL" |
| `issued_at` | timestamptz | Certificate generation timestamp |

**RLS**: Users can only SELECT their own certificate.

### `ai_usage`
Rate limiting table for AI endpoints.

| Column | Type | Description |
|---|---|---|
| `id` | uuid PK | Auto-generated |
| `user_id` | uuid FK | References auth.users |
| `endpoint` | text | e.g. "coach", "assistant" |
| `created_at` | timestamptz | Request timestamp |

Rate limit check: count rows where `user_id = X AND endpoint = Y AND created_at > now() - interval '1 hour'`. Limit: 20/hour.

### `lesson_progress` (migration 002)
Tracks lesson read status per module per user.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid FK | References auth.users |
| `module_id` | text | Module slug |
| `completed_at` | timestamptz | When lesson was marked read |

---

## 5. Game Mechanics & Scoring

All game math lives in `lib/game.ts` as pure functions. Constants:

```typescript
PASS_THRESHOLD = 0.70              // 70% to pass
QUIZ_SERVE_COUNT = 15              // Questions served per attempt
CONFIDENCE_BONUS_MULTIPLIER = 1.25 // Correct + Confident = +25%
CONFIDENT_WRONG_PENALTY = 0.20     // Wrong + Confident = -20%
```

### Points Allocation
`allocatePoints(modulePoints, serveCount)` distributes module's total points across served questions as evenly as possible. Remainder distributed to last N questions (some get base+1).

Example — 500 pts / 15 questions: base = 33, remainder = 5 → 10 questions get 33 pts, 5 get 34 pts. Sum = 500.

### Confidence-Weighted Scoring

| Answer | Confidence | Server-side calculation |
|---|---|---|
| Correct | Confident | `+Math.round(pts × 1.25)` |
| Correct | Guessing | `+pts` |
| Wrong | Confident | `−Math.round(pts × 0.20)` |
| Wrong | Guessing | `0` |

**Why this design**: Overconfident wrong answers represent the most dangerous knowledge gap (you'd act on wrong information). Guessing wrong carries no penalty because the user acknowledged uncertainty. Guessing right (lucky) earns base points but is flagged by the AI coach as a "lucky guess."

### Wireframe Assertions (in game.ts)
```typescript
assert(calcScoreAttainment(1950) === 38, "1950→38%");
assert(calcScoreAttainment(2850) === 56, "2850→56%");
assert(calcScoreAttainment(4350) === 85, "4350→85%");
assert(calcLevel(4) === 4, "4 modules→Lv4");
assert(calcLevel(6) === 5, "6 modules→Lv5");
```
The wireframe numbers ARE the unit tests. If these assertions fail, the build fails.

### Levels

| Modules Passed | Level | Title |
|---|---|---|
| 0 | 1 | Security Rookie |
| 1 | 1 | Security Rookie |
| 2 | 2 | Threat Spotter |
| 3 | 3 | Risk Analyst |
| 4 | 4 | Security Architect |
| 5–8 | 5 | Cyber Sentinel |

---

## 6. Quiz Engine

### Architecture
```
QuizPage (Server Component)
  └── QuizClientWrapper ("use client", ssr:false)
        └── QuizEngine ("use client", dynamic import)
```

The `ssr:false` split is required because `Math.random()` in `buildServedQuestions()` runs during Next.js hydration (even for client components), producing different question orders on server vs client → React hydration mismatch.

### Question Serving — `buildServedQuestions(mod)`
1. Copy `mod.quiz` array (30 questions)
2. Fisher-Yates shuffle the copy
3. Take first 15 (QUIZ_SERVE_COUNT)
4. For each question: shuffle options, find new index of correct answer
5. Assign `allocatedPoints` from `allocatePoints(mod.maxPoints, 15)`
6. Return as `ServedQuestion[]` with `servedOptions`, `servedCorrectIndex`, `allocatedPoints`

### Quiz State Machine
States: `idle → question → locked (answered) → [next] → results`

Per question flow:
1. User reads question + 4 shuffled options
2. User selects an option → options locked, confidence selector shown
3. User picks Confident or Just Guessing
4. Answer revealed: green (correct) / red (wrong) + explanation panel
5. "Next" → advance to next question or "Finish" on last

### Server-Side Verification (save-progress)
The client sends: `{moduleId, answers[], servedQuestionIds[], optionOrders{}, maxServedPoints}`.

Server rejects client score entirely. It recomputes:
1. Verify `questionId` is in `servedQuestionIds`
2. Look up question in original `mod.quiz` by ID
3. `selectedText = optionOrders[questionId][selectedIndex]`
4. `correctText = q.options[q.correctIndex]` (original order)
5. `actuallyCorrect = selectedText === correctText`
6. Apply confidence multiplier

A forged `selectedIndex` is worthless without the original `optionOrders` map.

### Results Screen
Shows:
- Score ring (percentage, pass/fail color)
- "PASSED ✓" or "NOT PASSED" banner
- Score: `baseScore / maxServedPoints pts`
- `+N confidence bonus 🎯` (if any)
- `−N overconfidence penalty` (if any)
- Pass mark: `Math.round(0.70 × maxServedPoints) pts`
- Per-question accordion: `+45 pts 🎯 · Confident` / `0 pts · Just Guessing` / `-7 pts · Confident`
- AI Cognitive Security Report panel (async, loads after quiz save)

---

## 7. AI System Architecture

### Provider Layer — `lib/ai/client.ts`

Three exported functions:

```typescript
generateAIText(prompt, system): Promise<string>
generateAIObject<T>(prompt, system, schema: ZodSchema<T>): Promise<T>
generateChat(system, messages: ChatMessage[], schema): Promise<{answer, suggestions}>
```

All use the same **4-attempt fallback chain**:

```
Attempt 1: Groq generateObject (structured JSON output)
Attempt 2: Gemini generateObject (structured JSON output)
Attempt 3: Groq generateText + regex JSON extract + zod.parse()
Attempt 4: Gemini generateText + regex JSON extract + zod.parse()
→ throw Error("All AI providers failed")  ← caught by caller, returns fallback shape
```

Why 4 attempts: Groq free tier occasionally returns 429 (rate limit) or fails to produce valid JSON in structured mode. Gemini is the safety net. Text+JSON parse is the last resort when structured output schemas confuse the model.

### Rate Limiting
Every AI API route checks `ai_usage` before calling the model:
```sql
SELECT COUNT(*) FROM ai_usage
WHERE user_id = $1 AND endpoint = $2
AND created_at > NOW() - INTERVAL '1 hour'
```
Limit: 20 requests/hour/endpoint/user. Returns 429 if exceeded.

### API Routes

#### `/api/ai/coach` — Smart Quiz Coach
**Input**:
```typescript
{ moduleId: string, moduleTitle: string, answers: {question, chosen, correct, wasCorrect, confidence}[] }
```
**System prompt**: Classify answers into blind spots (confident+wrong), lucky guesses (guessing+correct), known gaps (guessing+wrong), and strong knowledge (confident+correct). Generate a Cognitive Security Report.

**Output schema** (zod):
```typescript
{ summary: string, blindSpots: string[], luckyGuesses: string[], recommendation: string }
```
**Fallback**: `{ summary: "Keep learning!", blindSpots: [], luckyGuesses: [], recommendation: "Review the lesson." }`

#### `/api/ai/assistant` — Floating AI Assistant
**Input**:
```typescript
{ question: string, history: ChatMessage[], pageContext?: string }
```
- `history`: Last 20 turns of conversation (user + assistant messages)
- `pageContext`: Full lesson text injected when on a `/learn/[moduleId]` page

**System prompt**: Human personality with expressive language. When `pageContext` is provided, instructs the model to primarily use that content for answers. Varies response length based on question complexity.

**Output schema**:
```typescript
{ answer: string, suggestions: string[] }  // suggestions = follow-up chip text
```

**Conversation architecture**: Full `messages[]` array passed as `CoreMessage[]` to the model for attempts 1–2 (native multi-turn context). Attempts 3–4 serialize history as "User: ... Assistant: ..." text.

#### `/api/ai/tutor` — Lesson Tutor
Scoped to lesson content. 120-word response cap. Refuses off-topic questions. Used on `/modules/[id]/lesson` page via floating "Ask Tutor" button.

#### `/api/ai/phishing-sim` — Phishing Simulator
Generates a fake phishing email with embedded red flags (fictional brands/domains only). Returns `{emailHtml, redFlags[]}`. Grading is pure client-side — match user-clicked elements against returned `redFlags[]` IDs.

#### `/api/ai/practice` — Adaptive Practice
After quiz failure, sends wrong-answer topic list → receives 3 new MCQs targeting those exact weaknesses. Unscored — purely reinforcement. Uses same `QuizQuestion` zod schema as static questions.

---

## 8. Floating AI Assistant

### Component: `FloatingAssistant.tsx`

**Visibility logic**:
```typescript
const isQuizPage = pathname.includes("/quiz");
if (isQuizPage) return null; // Hidden during quiz — no coaching during assessment
```

**Page context extraction**:
```typescript
const isLearnPage = pathname.startsWith("/learn/");
if (isLearnPage) {
  const moduleId = pathname.split("/learn/")[1];
  const module = learningContent[moduleId];
  pageContext = serializeModuleContent(module); // Full lesson text as string
}
```

The assistant on the phishing lesson can answer "What is a spear phishing attack?" using the actual lesson content, not generic knowledge. On non-lesson pages (dashboard, profile, etc.), no `pageContext` is injected — the assistant answers from its training.

**Conversation history**:
- Stored in `useState` as `{role: "user"|"assistant", content: string}[]`
- Last 20 turns sent to API on each request
- History persists for the session (cleared on page refresh)
- Full `messages[]` array passed as native `CoreMessage[]` — not serialized text

**Suggestion chips**:
- AI returns 3 suggested follow-up questions
- Chips displayed below the assistant's reply
- Clicking a chip submits it as the next user message automatically

**UI states**: closed → open (chat history) → loading (spinner) → response → error

---

## 9. Learn Module

### Purpose
A creative addition beyond the original wireframes. Allows users to browse and read all module lessons in a Coursera/Udemy-style two-column layout without entering the quiz flow. Useful for reviewing before retaking a quiz.

### Pages
- `/learn` — Module browser: left panel lists 8 modules with progress badges, right panel prompts to select one
- `/learn/[moduleId]` — Renders `LearnPlayer` with the selected module pre-loaded

### `LearnPlayer.tsx` (Client Component)
```
┌─────────────────────────────────┬─────────────────────────────────────┐
│  Module List (left)             │  Lesson Content (right)             │
│  ┌───────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │ ✓ Phishing                │  │  │ <Module Title>                │  │
│  │ ✗ Passwords & 2FA         │  │  │                               │  │
│  │   Malware Defense         │  │  │ <Lesson sections, bullets,    │  │
│  │   ...                     │  │  │  headings rendered from       │  │
│  └───────────────────────────┘  │  │  learning-content.json>       │  │
│                                 │  └───────────────────────────────┘  │
└─────────────────────────────────┴─────────────────────────────────────┘
```

On mobile: stacks vertically (module list on top, content below).

### Content Source
`lib/learning-content.json` — mirrors the lesson structure from `content.json` but formatted specifically for the learn module UI and FloatingAssistant context injection. Contains headings, paragraphs, bullets, and callout blocks per module.

---

## 10. Badge & Reward System

### Unlock Condition
A badge unlocks when `module_progress.passed = true` for that module. Failing a quiz (score < 70%) does NOT unlock the badge — even if the user attempted the module.

### Badge Grid (badges/page.tsx)
Server Component fetches `module_id` WHERE `passed = true`. Shows 8 badge cards — unlocked cards show the Share button, locked cards show "Complete to unlock".

### Canvas Badge Image — `ShareButton.tsx`
On share click, draws a 480×480px PNG badge in-browser using the Canvas API:

```
┌─────────────────────────────────────┐
│  ████ CERTIFICATE OF ACHIEVEMENT ██│  ← accent-color banner
│  ████ CyberAI · Training Platform ██│
├─────────────────────────────────────┤
│                                     │
│           ┌─────────┐               │
│           │ ◈ ● ◈   │  ← starburst │
│           │  🛡️     │    + ring     │
│           │ ◈ ● ◈   │               │
│           └─────────┘               │
│                                     │
│      BADGE EARNED                   │
│    Phishing: The Lure (Email)       │
│         Awarded to:                 │
│         [User Display Name]         │
│  ─────────────────────────────────  │
│  cyberai.app · 11 Jun 2026         │
└─────────────────────────────────────┘
```

**User name source**: `user.user_metadata.display_name` (saved at signup) → fallback to email prefix.

**Share priority**:
1. `navigator.canShare({ files: [pngFile] })` → Web Share API with image (mobile)
2. `navigator.share({ title, text })` → Web Share API text-only (desktop browsers)
3. `navigator.clipboard.writeText(text)` → Clipboard copy fallback

---

## 11. Certificate System

### Unlock Condition
All 8 modules must be `passed = true`. Checked in `save-progress/route.ts` after each quiz submission:

```typescript
if (passed) {
  const { count } = await supabase
    .from("module_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("passed", true);

  if ((count ?? 0) >= 8) {
    // Generate CERT-ID if not exists
    const certId = "CERT-" + randomAlphanumeric(8);
    await supabase.from("certificates").insert({ user_id, cert_id: certId });
  }
}
```

### Certificate Design (CertificateView.tsx)
- Ornate bordered certificate with rust-red "CYBERAI" logo
- Split title "CERTIFICATE" / "OF COMPLETION" on two lines
- User's full name prominently displayed
- CERT-ID in monospace
- Completion date
- Download as PDF button (triggers `window.print()` with print-only CSS)
- Share button (Web Share API with text + fallback to clipboard)

---

## 12. Security Model

### Authentication
- Supabase email/password auth with JWT session cookies
- `middleware.ts` checks session on every `/(app)/*` route
- Server Components use `supabase.auth.getUser()` (validates JWT with server, not localStorage)
- Client components use browser Supabase client with cookie-based session

### Row Level Security (RLS)
Every table has policies restricting access to the row owner:

```sql
-- module_progress
CREATE POLICY "Users can manage own progress"
ON module_progress FOR ALL
USING (auth.uid() = user_id);

-- certificates, ai_usage: same pattern
```

No user can read or write another user's data, even with direct API calls.

### Score Integrity
Client sends answers, server computes score. The flow in `save-progress`:
1. Verify session → get `user.id`
2. zod-parse request body (rejects malformed input)
3. Load original questions from `content.json` (not from request)
4. For each answer: look up original correct text, compare to `optionOrders[id][selectedIndex]`
5. Apply confidence multipliers
6. Compute final score
7. Compare to existing score before upsert

The client's `score` field in the request body is ignored entirely.

### API Key Security
- `GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — server-only, never in client bundle
- `NEXT_PUBLIC_*` — only the two Supabase public keys (safe to expose per Supabase docs)
- All AI calls happen in API routes, never directly from client components

### Input Validation
All API routes use zod schemas:

```typescript
const bodySchema = z.object({
  moduleId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedIndex: z.number().int(),
    correct: z.boolean(),
    confidence: z.enum(["confident", "guessing"]),
    // ...
  })),
  // ...
});
const parsed = bodySchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
```

### AI Output Safety
- All AI responses validated with zod before use
- On parse failure: retry once, then return typed fallback shape (never crash)
- AI text rendered as plain text / markdown — never `dangerouslySetInnerHTML`
- Phishing simulator system prompt explicitly forbids real URLs, real brands

---

## 13. UI & Accessibility

### Responsive Breakpoints
All screens tested at:
- **360px** — mobile (MobileNav hamburger, stacked layouts)
- **768px** — tablet (some grid adjustments)
- **1280px** — desktop (Sidebar visible, two-column layouts)

### Dark Mode
- `next-themes` with `attribute="class"` — adds `dark` class to `<html>`
- Tailwind `dark:` variants on every color
- Sidebar always dark (`bg-gray-900`) regardless of theme
- System preference disabled (`enableSystem={false}`) — user toggle only

### Quiz Accessibility
- All option buttons keyboard-operable (Tab + Enter/Space)
- `aria-live="polite"` on answer reveal panel — screen readers announce correct/wrong
- Visible focus rings (`focus:ring-2 focus:ring-indigo-500`) on all interactive elements
- Confidence selector uses radio button semantics

### Loading & Error States
Every page has:
- Loading state (spinner or skeleton)
- Empty state with CTA (e.g., cheat sheet with no completed modules)
- Error state with fallback message

---

## 14. Key Engineering Decisions

### Why `ssr:false` for QuizEngine?
`buildServedQuestions()` calls `shuffleArray()` which uses `Math.random()`. In Next.js App Router, even `"use client"` components are SSR'd for the initial HTML payload. `Math.random()` returns different values on server vs client → hydration mismatch. Solution: `QuizClientWrapper` uses `dynamic(import QuizEngine, { ssr: false })`. The wrapper must itself be a Client Component (`"use client"`) because `ssr: false` is not allowed in Server Components.

### Why 30 questions per module instead of 4 (wireframe)?
The wireframes show 4 quiz questions per module. 4 questions is trivial to memorize — a user could pass by rote repetition. 30 questions with 15 served per attempt means each attempt is unique. The wireframe's 4 questions appear to be wireframe placeholders, not production intent.

### Why confidence affects scoring?
Pure correct/wrong scoring treats all wrong answers equally. Confidence data reveals cognitive state:
- Wrong + Confident = most dangerous (user would act on wrong belief)
- Wrong + Guessing = less dangerous (user knows they don't know)
- Right + Guessing = lucky (user doesn't know why they're right)

The -20% penalty for overconfident wrong answers creates a real incentive to only select "Confident" when genuinely sure. The AI coach also uses confidence to prioritize its recommendations.

### Why passed-only for badges/cheat-sheet/profile?
Rewards must reflect achievement, not just participation. Showing a cheat sheet for a failed module would undermine the pass incentive. The badge is an "earned" reward — it should mean something. Profile "Modules Completed" being wrong would mislead users about their progress. Certificate requires all 8 passed — consistent logic throughout.

### Why a Learn tab?
The original wireframes only have lesson → quiz. This means the only way to read lesson content again is to navigate back to the module's lesson page. A Coursera-style `/learn` browser lets users review all 8 modules' content in one place without interrupting their quiz state. It also provides a better surface for the FloatingAssistant to give page-aware answers.

### Why Canvas API for badge images instead of server-generated?
Server-side image generation (e.g., `@vercel/og`) requires an API route and a Vercel edge deployment. Canvas API is client-side, works on free Vercel tier, needs no new dependencies, and produces the same quality PNG. The downside is it only runs on devices with canvas support (all modern browsers).

### Why Groq as primary, Gemini as fallback?
Groq free tier has very high throughput (131k tokens/minute) and fast inference (~200 tok/s). Gemini has a lower throughput but more generous daily quota. Using both maximizes availability on the free tier. The 4-attempt chain handles structured output failures — both providers occasionally struggle with strict JSON schemas.

### Why static question bank + AI overlay?
A fully dynamic AI question generator would: (1) not match the wireframe (specific questions shown), (2) risk hallucinated security advice, (3) produce inconsistent scoring since answers would be AI-generated. The static bank is auditable, matches wireframes, and can't produce dangerous wrong answers. AI adds value through coaching, not through generating the core assessment content.

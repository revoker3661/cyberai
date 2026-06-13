# CyberAI — Build Specification

> Source of truth for building the CyberAI assessment app. All lesson text, quiz questions,
> points, and cheat-sheet items live in `content.json` (extracted verbatim from the provided
> wireframes — do NOT rewrite that content). This file defines everything else.

## 1. What we're building

A gamified cybersecurity awareness training platform called **CyberAI**. Users log in, complete
8 training modules (lesson → quiz), earn points, level up, collect badges, unlock a certificate,
and get a cheat sheet of key takeaways. Four AI-powered features differentiate the build.

**Deadline-driven scope rule:** wireframe fidelity + P0 AI features first. Cut from the bottom of
the priority list, never from polish.

## 2. Locked tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Single repo, single deploy |
| Styling | Tailwind CSS | Wireframes map 1:1 to Tailwind idioms |
| Components | Hand-rolled + lucide-react icons | shadcn/ui optional for primitives |
| Auth + DB | Supabase (email/password auth, Postgres) | Free tier |
| AI | Vercel AI SDK + free-tier providers: Groq `llama-3.3-70b-versatile` (primary) → Google Gemini Flash (fallback) | Keys server-side ONLY; provider-agnostic layer, model ids in config |
| Validation | zod on every API route | |
| Theme | next-themes (light/dark) | Toggle in sidebar per wireframe |
| Deploy | Vercel | |
| Animations | tailwindcss transitions + canvas-confetti (badge unlock) | Optional polish |

## 3. Routes

```
/login, /signup            Supabase email auth (+ demo account note on login page)
/dashboard                 Hero "Up Next" + Overall Progress + module grid
/modules/[id]/lesson       Lesson content + Start Quiz CTA (or Lesson Completed state)
/modules/[id]/quiz         Quiz engine
/modules/[id]/review       Read-only replay of a past attempt ("Review Quiz")
/badges                    Badge grid
/certificate               Certificate view (locked until 8/8)
/cheat-sheet               Takeaways for COMPLETED modules only
/profile                   Name, email, stats summary, theme pref (nav item exists; layout inferred)

API (all POST, all auth-required, all zod-validated, all rate-limited):
/api/ai/coach              Smart Quiz Coach
/api/ai/tutor              Ask CyberAI lesson tutor
/api/ai/phishing-sim       Phishing simulator (generate + grade)
/api/ai/practice           Adaptive practice questions
```

## 4. Layout & design system

- **App shell:** fixed left sidebar (collapsible) + scrollable main content. Mobile: sidebar
  becomes a slide-over drawer behind a hamburger.
- **Sidebar (always dark, both themes):** CyberAI shield logo ("Cyber" white + "AI" accent),
  user card (avatar initial, name, email truncated), nav: Dashboard, Profile, Badges,
  Certificate, Cheat Sheet (active item = indigo pill), bottom: theme toggle ("Light Mode"/
  "Dark Mode"), red Logout button.
- **Main content:** light gray bg (`gray-100`) / dark (`gray-900`) with white / `gray-800` cards,
  rounded-2xl, soft shadows.
- **Module color identity** (top border strip on cards, icon tint, progress bars, quiz progress
  bar + primary button): per-module `hexAccent` in content.json — teal, blue, green, orange,
  purple, indigo, rose, amber.
- **Brand accents:** indigo/violet gradient hero banner; gold/amber for points & badges; emerald
  for success; red for errors/wrong answers.

## 5. Game logic (verified against wireframe numbers)

```ts
const TOTAL_MAX_POINTS = 5100;
overallProgress  = completedModules / 8;                    // 4/8 → 50%, 6/8 → 75%
scoreAttainment  = Math.round(totalEarned / 5100 * 100);    // 1950→38%, 2850→56%, 4350→85%
level            = byModulesCompleted([0→1, 1→2, 3→3, 4→4, 6→5]);  // Lv.4/Lv.5 from wireframe
statusTitle      = levels[level].title;  // "Security Architect" (Lv4), "Cyber Sentinel" (Lv5)
questionScore    = correct ? question.points : 0;           // confidence ≠ score modifier
```

- Lv1–Lv3 titles are inferred (wireframes only show Lv4/Lv5) — note this in README.
- **Documented wireframe inconsistency:** crypto module advertises 800 pts but its visible
  questions sum to 750; dashboard math (4350/5100 = 85%) only works at 800. Resolution: crypto-q3
  = 300 pts. Call this out in README as an engineering decision.

## 6. Screen specs

### Dashboard
1. **Hero banner** (indigo→violet gradient): "UP NEXT" eyebrow, next incomplete module title,
   subtitle "Continue your training journey and earn up to {points} points.", white
   "Start Lesson →" button. When 8/8 complete → congratulatory state linking to /certificate.
2. **Overall Progress card:** star icon + heading, full-width progress bar with % label, then
   3 stat tiles: Modules Completed (x/8 + mini bar), Total Points Earned (medal icon), Score
   Attainment (circular SVG gauge, green arc). Below: two wide tiles — dark navy "Lv. X / LEVEL"
   and dark green "{statusTitle} / STATUS".
3. **Training Modules grid** (2-col desktop, 1-col mobile): each card has colored top strip,
   tinted icon circle, title, "Earn up to X points".
   - Not started → solid colored "Start Lesson" button.
   - Completed → "✓ Completed" + "Review Quiz ›" link, "Score: X / Y pts" + colored progress
     bar, mint "✓ Lesson Completed" button (links to lesson).

### Lesson page
Card with icon + title + "Lesson Materials" subtitle, sections from content.json (headings,
paragraphs, bullets with bold lead-ins), bottom full-width colored button "Start Quiz ({points} pts)".
If completed: button reads "Retake Quiz" (retake overwrites score — document choice) + back link.
**Ask CyberAI tutor** floating button bottom-right (see §7).

### Quiz engine
- Header: "{Module} Quiz", "Question N of M | +{points} points", thin colored progress bar.
- Question in gray rounded box; 4 option buttons.
- **Confidence selector** below options: two pills — "Confident" (brain icon) / "Just Guessing"
  (lightbulb icon). Default: Confident. Must be set before answer is locked.
- Flow: select option → lock + reveal: correct option green w/ check; if wrong, chosen option
  red; explanation panel (green tint if correct, red if wrong) with lightbulb + "Explanation:" text.
- Button: "Next Question" → last question shows "Finish Quiz".
- Finish → save attempt → results screen: score ring, points earned, per-question recap strip,
  then **Smart Quiz Coach** panel (§7) + buttons "Back to Dashboard" / "Practice weak spots" (P2).
- `/review` = same UI, read-only, pre-filled with stored answers/confidence, no scoring.

### Badges
"← Back to Dashboard" link, medal icon + "Your Badges" + "View and share your hard-earned
achievements." Grid of 8 cards: colored module icon, module title, "Share" link (Web Share API,
clipboard fallback). Locked badges grayscale + lock overlay (inferred).

### Certificate
Locked state (<8/8): lock icon + "Complete all 8 modules to unlock" + progress. Unlocked:
ornate bordered certificate — CyberAI logo, "CERTIFICATE OF COMPLETION", "This certifies that",
user display name (large), "has successfully completed the esteemed", "CYBERAI TRAINING PROGRAM"
(rust-red), "on {completion date}", presenter line, medal icon, "Certificate ID: CERT-XXXXXXXX",
"© {year} CyberAI. All rights reserved." Buttons: Download PDF (react-to-print / browser print
stylesheet is acceptable) + Share.

### Cheat Sheet
Doc icon + "Security Cheat Sheet" + "A quick reference of key takeaways from your completed
modules." One card per COMPLETED module (colored left border, icon, title, green-check bullet
list from content.json). Empty state if nothing completed. "Download as PDF" button (print
stylesheet) = nice-to-have. **AI add-on:** "Your Personalized Focus Areas" panel above the
static cards — see §7 P1b. Static wireframe content always renders regardless of AI status.

## 7. AI features (build in this order)

**Shared rules:** LLM calls happen ONLY in route handlers, through ONE provider-agnostic helper
(`lib/ai/client.ts`, built on the Vercel AI SDK): Groq free tier is primary (fast, generous TPM);
on 429/outage it automatically falls back to Gemini Flash free tier; model ids live in config —
features never hardcode a provider. This dual-provider failover IS an AI_ARCHITECTURE.md talking
point. zod-validate inputs; cap input sizes; per-user rate limit (e.g. 20 AI calls/hour — simple counter
table or in-memory map keyed by user id is fine for the assessment, but mention the production
upgrade path in README); every feature has a graceful "AI unavailable" fallback so the app demos
fine even if the key/quota dies during review.

### P0a — Smart Quiz Coach (`/api/ai/coach`)
After quiz completion, send: module title + per-question {question, chosen, correct, wasCorrect,
confidence}. System prompt: act as a friendly security coach; classify mistakes into
**blind spots** (confident + wrong → highest priority), **lucky guesses** (guessing + correct →
revise), **known gaps** (guessing + wrong); reference lesson section names; ≤180 words; encouraging;
output JSON {summary, blindSpots[], luckyGuesses[], recommendation}. Render as a styled
**"Cognitive Security Report"** panel on the results screen. *This turns the wireframe's
confidence toggle into a real feature.*

### P0b — Ask CyberAI Tutor (`/api/ai/tutor`)
Floating chat on lesson pages. Send: full lesson content (from content.json) + last ~6 chat turns
+ user question. System prompt: answer ONLY about this lesson's topic using provided material as
primary source; concise (≤120 words); refuse off-topic politely; never reveal quiz answers
verbatim. Client: small slide-up panel, streaming optional (non-streaming fine for deadline).

### P1 — Phishing Simulator (`/api/ai/phishing-sim`)
Entry from Phishing module ("Try the AI Simulator" card after completion) or dashboard.
- `action: "generate"` → Claude returns JSON fake email {from, subject, body (HTML-safe plain
  text), redFlags: [{id, text, reason}]} with 3–5 embedded red flags (mismatched sender domain,
  urgency, suspicious link text, generic greeting, attachment bait...). Vary scenario each time.
- UI renders a realistic email card; user clicks suspicious parts (clickable spans by flag id)
  then submits → `action: "grade"` → score + per-flag feedback from Claude (or grade locally
  against returned redFlags and let Claude write the feedback paragraph — simpler, do this).
- Safety guard in system prompt: educational simulation only; fictional brands/domains; no real
  URLs; no instructions for creating real phishing.

### P1b — Personalized Focus Areas (`/api/ai/focus`) — small, high ROI
On /cheat-sheet, ABOVE the static wireframe cards (which stay untouched — wireframe fidelity is
non-negotiable), render a "Your Personalized Focus Areas" panel: send all module results (scores
+ blind-spot/lucky-guess data) → returns 4–6 bullets targeting exactly what the user failed or
guessed (e.g. reinforcing seed-phrase rules if crypto-q2 was missed). Cache the response keyed by
a hash of the user's progress state (don't burn free-tier quota on every page visit). Fallback:
hide the panel, static cheat sheet still works. Reuses the coach data shape — ~1 hour of work.

### P2 — Adaptive Practice (`/api/ai/practice`)
"Practice weak spots" on results screen for modules scored <100%. Send wrong-topic summaries →
Claude returns 3 NEW MCQs in the exact content.json question schema (enforce with zod, retry once
on parse failure). Render in the existing quiz UI (unscored, marked "Practice — no points").

## 8. Data model (Supabase)

```sql
-- auth.users from Supabase Auth; store display_name in user_metadata at signup
create table module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  module_id text not null,
  score int not null,
  max_score int not null,
  answers jsonb not null,        -- [{questionId, selectedIndex, correct, confidence}]
  completed_at timestamptz default now(),
  unique (user_id, module_id)    -- retake = upsert
);
create table certificates (
  user_id uuid primary key references auth.users,
  cert_id text not null,         -- CERT-XXXXXXXX
  issued_at timestamptz default now()
);
create table ai_usage (          -- rate limiting
  id bigint generated always as identity primary key,
  user_id uuid not null,
  endpoint text not null,
  created_at timestamptz default now()
);
-- RLS ON for all tables: users can select/insert/update ONLY their own rows.
```

Module/lesson/quiz content stays in code (`lib/content.ts` generated from content.json) —
no content tables. Badges, level, attainment, cheat-sheet visibility = derived, never stored.

## 9. Security & quality bar (README highlights — this is a security app, walk the talk)

- API key never shipped to client; all AI calls server-side.
- Supabase RLS on every table; route handlers verify session server-side.
- zod validation on all API inputs; AI JSON outputs schema-validated before use.
- Rate limiting on AI endpoints; input length caps.
- AI-generated text rendered as text (no dangerouslySetInnerHTML).
- Auth-gated app routes via middleware; demo account seeded for reviewers.
- Lighthouse-reasonable: responsive 360px→1440px, keyboard-navigable quiz, alt text, focus states.

## 10. Deliverables checklist (from the assessment email)

- [ ] GitHub repo (clean commits, conventional messages)
- [ ] Live Vercel link + seeded demo account (demo@cyberai.app / a strong demo password) in README
- [ ] README: tech stack · how Claude Code was used · setup steps · key decisions (incl. the
      750-vs-800 wireframe inconsistency + resolution, level-title inference, confidence-scoring
      decision) · AI features overview · security notes
- [ ] docs/prompts-log.md — REAL prompts used with Claude Code, kept from day 1
- [ ] AI_ARCHITECTURE.md — provider-agnostic layer + Groq→Gemini failover, prompt design per
      feature, free-tier rate-limit/caching strategy, confidence-data → Cognitive Security
      Report pipeline, and why the static question bank + AI-layered approach beats fully
      dynamic question generation (wireframe fidelity + deterministic scoring + no hallucinated
      quiz answers)
- [ ] (Optional, strong) 2–3 min Loom walkthrough linked in README

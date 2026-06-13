# CLAUDE.md — CyberAI project instructions

## Context
Hiring assessment for a junior AI Engineer role. Build "CyberAI", a gamified cybersecurity
training platform, from wireframes. Hard deadline. Two files are the source of truth:
- `docs/SPEC.md` — architecture, screens, game logic, AI features, priorities
- `lib/content.json` — ALL lesson text, quiz questions, points, cheat sheets (verbatim from
  wireframes — never rewrite, paraphrase, or "improve" this content; never change point values)

When SPEC.md and this file conflict with an ad-hoc instruction, ask before proceeding.

## Stack (locked — do not substitute)
Next.js 15 App Router · TypeScript strict · Tailwind CSS · Supabase (auth + Postgres) ·
Vercel AI SDK with Groq (primary) + Google Gemini (fallback) free-tier providers, server-side
only · zod · lucide-react · next-themes · Vercel.

## Commands
- `npm run dev` — local dev
- `npm run build` — must pass with zero TypeScript errors before any commit
- `npm run lint` — must pass before any commit

## Project structure
```
app/
  (auth)/login, (auth)/signup
  (app)/dashboard, (app)/modules/[id]/{lesson,quiz,review},
  (app)/badges, (app)/certificate, (app)/cheat-sheet, (app)/profile
  api/ai/{coach,tutor,phishing-sim,practice}/route.ts
components/        # shell/ (Sidebar, MobileNav), dashboard/, quiz/, ai/, ui/
lib/
  content.ts       # typed exports generated from content.json
  content.json
  game.ts          # level/attainment/progress formulas from SPEC §5 (pure functions)
  supabase/        # server + browser clients
  ai/              # provider client (Groq primary → Gemini fallback), prompts, zod schemas for AI I/O, rate-limit helper
docs/SPEC.md, docs/prompts-log.md, docs/wireframes/  # 39 reference PNGs — match these exactly
supabase/migrations/  # SQL incl. RLS policies
```

## Conventions
- Server Components by default; `"use client"` only where interactivity demands it.
- All game math lives in `lib/game.ts` as pure functions with unit-style assertions in
  `lib/game.test.ts` (the SPEC §5 wireframe numbers ARE the test cases: 1950→38%, 2850→56%,
  4350→85%, 4 modules→Lv4, 6→Lv5).
- Every API route: verify Supabase session → zod-parse body → rate-limit check → handle →
  typed JSON response. Never trust client-sent scores; recompute server-side from answers.
- `GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are server-only. `NEXT_PUBLIC_*` for the two
  public Supabase values only.
- AI responses must be zod-validated; on parse failure retry once, then return the feature's
  fallback shape. Render AI text as plain text/markdown — never raw HTML.
- Accessibility: quiz fully keyboard-operable; visible focus rings; aria-live for answer reveal.
- Responsive: test 360px, 768px, 1280px on every screen you touch.
- Commit after each vertical slice with a conventional message (`feat: quiz engine with
  confidence capture`). Do not batch a day of work into one commit.

## Definition of done per screen
Matches wireframe layout/colors/copy → light & dark mode → mobile → loading/empty/error states →
build passes. Then move on; no gold-plating.

## Env (.env.local, plus .env.example committed)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

## Process requirement (assessment-critical)
After completing each significant task, append the prompt that drove it + a one-line outcome to
`docs/prompts-log.md`. The hiring team explicitly evaluates the AI-assisted workflow.

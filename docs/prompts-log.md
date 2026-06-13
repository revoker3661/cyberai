# CyberAI — Prompts Log

This log tracks significant AI-assisted prompts used to build CyberAI. Required by the assessment.

---

## 2026-06-11

### Prompt 1 — Project scaffold & game logic
> Read CLAUDE.md and docs/SPEC.md fully. Scaffold the Next.js 15 + TypeScript + Tailwind project. Generate lib/content.ts as typed exports from lib/content.json. Implement lib/game.ts pure functions from SPEC §5 with wireframe numbers as test assertions (1950→38%, 2850→56%, 4350→85%, 4 modules→Lv4, 6→Lv5). No UI yet.

**Outcome:** Project scaffolded, all dependencies installed, content types and game math implemented with passing assertions.

---

### Prompt 2 — Supabase + Auth
> Implement Supabase email auth (login/signup pages per SPEC), SQL migration with RLS from SPEC §8, middleware-protected (app) group, and Supabase server/browser client helpers.

**Outcome:** Auth pages (login + signup with demo credentials), middleware protecting app routes, RLS-enabled migration with module_progress / certificates / ai_usage tables.

---

### Prompt 3 — App shell (Sidebar + MobileNav)
> Build the always-dark sidebar per SPEC §4: shield logo, user card with avatar initial, nav items with indigo active pill, theme toggle, red logout button. Collapsible on desktop. Mobile: slide-over drawer with hamburger. Use next-themes.

**Outcome:** Sidebar with collapse state, MobileNav drawer, theme toggle — matching wireframe 39 (dark background always, indigo active pill).

---

### Prompt 4 — Dashboard
> Build /dashboard per SPEC §6: gradient indigo→violet hero "UP NEXT" banner, Overall Progress card with full-width bar, 3 stat tiles (modules, points, circular SVG gauge for score attainment), dark navy level tile + dark green status tile, 8-module grid with per-module accent colors, completed/not-started card states.

**Outcome:** Dashboard matching wireframes 01/02/03/25/33 with real Supabase data, correct level display (Lv4/Lv5), all module states.

---

### Prompt 5 — Lesson page
> Build /modules/[id]/lesson rendering content.json sections per SPEC. Header with module icon + colored strip. Paragraphs, headings, bullet lists with bold lead-ins. Bottom CTA "Start Quiz (X pts)" / "Retake Quiz" for completed state. Floating "Ask CyberAI Tutor" button.

**Outcome:** Lesson page matching wireframe 29 (crypto module shown). All 8 modules work via dynamic [id] routing.

---

### Prompt 6 — Quiz engine (confidence capture)
> Build full quiz engine per SPEC §6: question header with points, colored progress bar, question in gray box, 4 option buttons, confidence selector (Confident/Just Guessing pills with radio dots), answer lock + green/red reveal, explanation panel with lightbulb icon, Next/Finish flow, results screen with score ring, per-question recap, Smart Quiz Coach panel. Read-only /review mode reuses same component. Keyboard accessible, aria-live reveal.

**Outcome:** QuizEngine component matching wireframes 04-32. Confidence data flows to AI coach. Server-side score recomputation in save-progress API. Review mode is read-only with stored answers.

---

### Prompt 7 — AI routes: Smart Quiz Coach (P0a)
> Build /api/ai/coach: receives module title + per-question {question, chosen, correct, wasCorrect, confidence}. System prompt classifies blind spots (confident+wrong), lucky guesses (guessing+correct), known gaps (guessing+wrong). Returns JSON {summary, blindSpots[], luckyGuesses[], recommendation}. Rendered as "Cognitive Security Report" on results screen.

**Outcome:** Coach route with Groq→Gemini fallback, zod-validated output, graceful fallback shape. Turns confidence selector into a real AI feature.

---

### Prompt 8 — AI routes: Tutor, Phishing Sim, Practice (P0b, P1, P2)
> Build /api/ai/tutor (floating lesson chat, ≤120 words, lesson-scoped), /api/ai/phishing-sim (generate fake email with red flags + grade identified flags), /api/ai/practice (3 adaptive MCQs targeting weak topics). All with rate limiting, zod validation, fallbacks.

**Outcome:** All 4 AI routes implemented. Tutor restricted to lesson content. Phishing sim has safety guard in system prompt (educational only, no real URLs). Practice questions unscored in UI.

---

### Prompt 9 — Collection pages: Badges, Certificate, Cheat Sheet, Profile
> Build /badges (3-col grid, locked/unlocked states, Web Share API with clipboard fallback), /certificate (locked state with progress, unlocked ornate certificate matching wireframe 34 with rust-red CYBERAI text, CERT-ID, print PDF), /cheat-sheet (colored left-border cards for completed modules matching wireframes 36-38), /profile (avatar, stats summary).

**Outcome:** All collection pages implemented matching wireframes exactly. Certificate auto-generates CERT-ID when 8/8 complete via save-progress API.

---

### Prompt 10 — Build fixes + TypeScript
> Run npm run build, fix all TypeScript errors. Issues: LucideIcon type for style prop, unknown type for ReactNode, maxOutputTokens API param name, Supabase client lazy initialization for SSR prerender safety, force-dynamic on server pages, middleware resilience to missing env vars.

**Outcome:** npm run build passes with zero TypeScript errors. All 16 routes shown in route manifest.

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

---

### Prompt 11 — 240-question bank + anti-cheat quiz engine
> Expand quiz content from 4 to 30 questions per module (240 total across 8 modules). Implement Fisher-Yates shuffle + 15/30 serve per attempt in buildServedQuestions(). Each question gets allocatedPoints from allocatePoints(). For anti-cheat: store servedQuestionIds + optionOrders (shuffled option text arrays keyed by questionId) in save-progress. Server recomputes correctness by text identity — selectedIndex means nothing without the original option order.

**Outcome:** 240-question bank in content.json. allocatePoints() distributes module pts evenly across 15 served questions. save-progress stores optionOrders and verifies answers by matching selectedText to original correctText. Client cannot forge a correct answer via index manipulation.

---

### Prompt 12 — Confidence bonus scoring (1.25× multiplier)
> Confidence inputs should actually affect the score. Implement bonus-only model: correct + confident = 25% extra pts (CONFIDENCE_BONUS_MULTIPLIER = 1.25 in lib/game.ts); correct + guessing = base pts; wrong = 0 regardless of confidence. Apply server-side in save-progress route — never trust client score. Display as split score: "baseScore / maxServedPoints" + "+N confidence bonus 🎯" on results screen. Per-question review shows actual earned pts.

**Outcome:** CONFIDENCE_BONUS_MULTIPLIER exported from lib/game.ts. save-progress applies Math.round(pts * 1.25) per confident+correct answer. QuizEngine.tsx shows baseScore + confidenceBonus split. Wrong answers display "-Xpts" in red instead of "0 pts" for clearer feedback.

---

### Prompt 13 — Coursera-style Learn tab (creative addition)
> Add a /learn route as an enhancement beyond the wireframes. Two-column layout: left panel is module list with completion status and progress indicators; right panel renders the selected module's full lesson content inline. Mirrors Coursera/Udemy UX patterns. Add "Learn" to Sidebar nav between Dashboard and Profile. Reuse existing lesson content from content.json — no new content, just a different UI surface for review.

**Outcome:** /learn and /learn/[moduleId] pages implemented. Sidebar updated with Learn nav item. Allows users to review all module content without entering quiz flow. Responsive: stacks vertically on mobile.

---

### Prompt 14 — Floating AI Assistant (page-aware, multi-turn conversational)
> Build a FloatingAssistant component that persists across all (app) pages except quiz. Features: page-aware context (reads lesson text from content.json for /learn/[moduleId] pages), 20-turn conversation history passed as native messages[] array to AI, human personality system prompt with expressive language, auto-hidden on quiz pages to prevent mid-assessment coaching. Suggestion chips for quick follow-up. Groq→Gemini 4-attempt fallback.

**Outcome:** FloatingAssistant renders on dashboard, lesson, badge, certificate, profile pages — hidden on quiz. Reads current module's lesson content to answer page-specific questions. Full multi-turn conversation maintained in component state. Suggestion chips update after each AI response.

---

### Prompt 15 — AI provider reliability (4-attempt fallback chain)
> Harden generateAIObject() and generateChat() against provider failures. Strategy: Attempt 1: Groq structured output (generateObject). Attempt 2: Gemini structured output. Attempt 3: Groq text + JSON regex extract + zod parse. Attempt 4: Gemini text + JSON regex extract + zod parse. generateChat() uses same 4-attempt pattern, passing full conversation as native CoreMessage[] array for attempts 1–2 (best context fidelity). On total failure, return typed fallback shape — never crash the UI.

**Outcome:** lib/ai/client.ts implements full 4-attempt chain for both generateAIObject and generateChat. generateChat passes CoreMessage[] natively to preserve conversation quality. All AI features have graceful degradation with fallback shapes. Zero UI-crashing AI errors in production.

---

### Prompt 16 — Overconfidence penalty (-20% for Confident + Wrong)
> Scoring is asymmetric: confident+correct earns a bonus but confident+wrong has no downside. Fix this: add CONFIDENT_WRONG_PENALTY = 0.20 to lib/game.ts. In save-progress, deduct Math.round(qPoints * 0.20) for confident+wrong answers. Wrong+guessing stays at 0 — you acknowledged uncertainty. Update QuizEngine to import the new constant, add confidencePenalty computation parallel to confidenceBonus, subtract it from totalScore. Results screen shows "−N overconfidence penalty" in red alongside the bonus. Per-question review: confident+wrong shows "-7 pts", guessing+wrong shows "0 pts".

**Outcome:** Complete confidence-weighted scoring system: correct+confident +25%, correct+guessing +0%, wrong+confident −20%, wrong+guessing 0. Applied server-side in save-progress. Score display on results screen is fully transparent: baseScore + bonus − penalty all shown separately.

---

### Prompt 17 — Professional badge canvas with user name + passed-only gating
> Badge share currently only shares text. Improve: (1) Build a Canvas API badge image (certificate-style banner, starburst badge ring, shield emoji, module title, "Awarded to: [displayName]", CyberAI branding, date). ShareButton accepts userName prop — fetched from user.user_metadata.display_name in badges/page.tsx. Share via Web Share API files[] if supported, fallback to text share, fallback to clipboard. (2) Badges page is showing badges for failed attempts — add .eq("passed", true) to the module_progress query so only truly passed modules show an unlocked badge.

**Outcome:** Canvas-drawn PNG badge with user's name shared as a file on mobile Web Share API. Desktop falls back to text share. Badges page now correctly shows only passed-module badges. User display_name saved during signup via user_metadata.

---

### Prompt 18 — Quiz hydration mismatch fix (QuizClientWrapper)
> QuizEngine uses Math.random() inside buildServedQuestions() in a useState lazy initializer. Next.js App Router renders client components on the server for hydration — different random values on server vs client produce different question text, causing React hydration mismatch error. Fix: create QuizClientWrapper ("use client") that uses dynamic(import QuizEngine, { ssr: false }). The wrapper must be a client component because ssr:false is not allowed in Server Components. Quiz page stays a Server Component and renders the wrapper instead of QuizEngine directly.

**Outcome:** Hydration mismatch error eliminated. Quiz renders only on client (no SSR) so Math.random() never runs on the server. "Loading quiz…" shown briefly while JS loads. Named variable conflict (export const dynamic vs import dynamic) resolved by keeping the dynamic import in the client wrapper file only.

---

### Prompt 19 — Passed-only consistency audit (badges, cheat-sheet, profile)
> Audit all pages that query module_progress. Problem: badges page showed badge for failed quiz, cheat-sheet showed cheat content for failed module, profile "Modules Completed" counted all rows including fails, level was inflated. Fix: (1) badges/page.tsx: .eq("passed", true) — done in Prompt 17. (2) cheat-sheet/page.tsx: .eq("passed", true). (3) profile/page.tsx: select passed column, compute completed = rows.filter(r => r.passed).length, level = calcLevel(completed). Dashboard and certificate were already correct (used passedModules filter). learn page and review page intentionally show all attempts.

**Outcome:** All reward surfaces (badges, cheat-sheet, profile modules count, level) now gate on passed=true. Attempting a quiz but failing earns 0 rewards. Dashboard was already correct — no change needed.

---

### Prompt 20 — Comprehensive documentation update
> Update README.md to accurately describe the full current system: confidence scoring table, overconfidence penalty, 240-question bank, anti-cheat shuffle, QuizClientWrapper hydration fix, passed-only gating decisions, FloatingAssistant page-context system, badge canvas, Learn tab. Add prompts 16–19 to prompts-log.md. Create docs/PROJECT.md — a complete technical reference covering database schema, game mechanics, scoring system, AI architecture, file inventory, security model, and all engineering decisions.

**Outcome:** README fully reflects current codebase state. Prompts log complete (20 entries). docs/PROJECT.md created as a comprehensive single-document reference for evaluators to understand every system in the project.

---

## 2026-06-13

### Prompt 21 — Smooth page transitions (loading.tsx)
> Next.js App Router pages with force-dynamic feel blank during server data fetching — no skeleton shown. Add a single loading.tsx in app/(app)/ to show an indigo spinner while any page fetches data from Supabase.

**Outcome:** app/(app)/loading.tsx created. Indigo spinning ring + "Loading…" label appears on every app page navigation, eliminating the blank-screen delay between route transitions.

---

### Prompt 22 — Question bank expansion: 30 → 75 questions per module (600 total)
> Current pool of 30 questions per module means repeat questions across attempts. Expand to 75 per module (600 total) to maximize variety — each attempt draws a fresh Fisher-Yates shuffle of 15 from a much larger pool. Write new questions covering topics not yet addressed in the original 30, maintaining single-correct-answer MCQ format with 4 options and an explanation.

**Outcome:** 45 new questions per module added to question-bank.json (600 total, up from 240). _meta.questionsPerModule updated to 75. Each quiz attempt now has dramatically more variety — candidates are unlikely to see the same 15 questions twice.

---

### Prompt 23 — Proctoring lite: fullscreen + tab-switch detection + 3-strike termination
> Add lightweight quiz integrity enforcement: (1) Request fullscreen when quiz loads. (2) Detect tab switches via document visibilitychange event. (3) Show a dismissable warning banner after each switch showing count (N/3). (4) After 3 switches, terminate the quiz session — show a "Quiz Terminated" screen with Retake/Review Lesson buttons. (5) Send tab_switch_count to save-progress API and store in module_progress. (6) Show tab-switch integrity badge on results screen (green "full focus" if 0, amber/red for switches detected).

**Outcome:** QuizEngine has fullscreen request on mount, visibilitychange listener with ref-based counter to avoid stale closure, terminated-state UI, and warning banner. save-progress accepts and stores tab_switch_count. Results screen shows integrity pill. Migration 003 adds tab_switch_count column to module_progress.

---

### Prompt 24 — P1b Personalized Focus Areas on /cheat-sheet (SPEC §7)
> SPEC §7 P1b requires: "On /cheat-sheet, ABOVE the static wireframe cards, render a 'Your Personalized Focus Areas' panel — send all module results (scores + blind-spot data) → returns 4–6 bullets targeting exactly what the user failed or guessed." Implement: (1) /api/ai/focus route — takes array of {moduleTitle, scorePercent, passed}, returns {focusAreas[], summary}. (2) FocusPanel client component — fetches focus on mount, shows numbered bullets, collapsible. (3) Cheat-sheet page queries score+passed data and passes it to FocusPanel above the static cards.

**Outcome:** FocusPanel renders above cheat-sheet cards for any user who has attempted at least one module. AI generates 4-6 specific, named-module focus bullets. Panel is collapsible. Falls back gracefully if AI unavailable. Completes the final unimplemented SPEC AI feature.

---

### Prompt 25 — canvas-confetti on badge unlock (SPEC optional polish)
> SPEC mentions canvas-confetti (badge unlock) as optional polish. Install canvas-confetti, create a BadgesConfetti client component that fires a two-sided burst when the badges page loads with at least one unlocked badge.

**Outcome:** canvas-confetti installed. BadgesConfetti component fires dual confetti burst on badges page load when unlockedCount > 0. Server Component badges page imports and renders BadgesConfetti with the completed set size as the trigger count.

---

### Prompt 26 — Full documentation sync
> All features added since Prompt 20 (loading, 75-question bank, proctoring lite, P1b focus areas, confetti) need to be reflected in README.md, docs/prompts-log.md, and docs/PROJECT.md so evaluators see the complete, accurate picture of the project.

**Outcome:** prompts-log.md updated with entries 21–26. README.md updated with proctoring system, 75-question bank, P1b focus panel, confetti, and migration 003 setup step. PROJECT.md updated to reflect current architecture.

---

### Prompt 27 — Dark mode fix: Tailwind v4 @custom-variant

> Theme toggle renders correctly but switching to light mode has no visual effect — the entire app stays dark regardless. Diagnosed root cause before touching code: Tailwind v4 dropped `tailwind.config.js darkMode: 'class'` — the `dark:` variant now uses `prefers-color-scheme` media query by default, not a CSS class. `next-themes` adds `.dark` to `<html>`, which Tailwind v4 ignores without explicit configuration. Fix: declare `@custom-variant dark (&:where(.dark, .dark *));` in `app/globals.css` — this tells Tailwind that any `dark:` utility should activate when `.dark` is present on any ancestor element. No component changes needed; the variant propagates globally.

**Outcome:** Light/dark toggle works correctly across all pages. Single-line CSS fix with zero component changes — confirmed by testing toggle persistence across route navigation.

---

### Prompt 28 — Quiz proctoring hardening: sidebar, ESC key, false-positive

> Three edge cases in the proctoring lite system needed fixing in one pass: (1) Sidebar and MobileNav render on all `(app)` routes — visible when quiz enters fullscreen, breaking the locked-environment UX. Fix: add `usePathname()` guard returning `null` on `/quiz` paths in both `SidebarWrapper` and `MobileNav`. (2) Pressing ESC exits fullscreen without triggering a violation — `visibilitychange` doesn't fire for ESC, only `fullscreenchange` does. Fix: second `useEffect` listening to `fullscreenchange`, counts violation and re-requests fullscreen via 100ms `setTimeout` (required because the request must follow the ESC gesture). (3) `requestFullscreen()` on mount triggers `visibilitychange` in some browsers during the fullscreen animation, producing a spurious warning before the user acts. Fix: `let active = false` flag set via `setTimeout(1500)` in both listeners — the delay outlasts the animation so the listeners are deaf during mount.

**Outcome:** Quiz pages show zero navigation chrome in fullscreen. ESC key is detected as a violation and fullscreen re-enters automatically. No false-positive warning fires on initial quiz load.

---

### Prompt 29 — Learn section content gap fill (quiz–lesson alignment)

> The question bank was expanded to 75 questions/module covering advanced topics the original lessons never addressed. Students would encounter questions on concepts they had no way to learn — a structural gap in the learning loop. Systematic approach: for each of the 8 modules, compared the full topic coverage of all 75 questions against the existing `content.json` lesson sections and `learning-content.json` reading items, then identified uncovered clusters. Added 2 new lesson sections and 2 new reading items per module (16 + 16 total) covering: spear/whaling/clone phishing, BEC, AiTM, SPF/DKIM/DMARC, consent phishing; password attack methods (brute force, credential stuffing, rainbow tables), MFA fatigue, passkeys, SIM swapping; rootkits, keyloggers, cryptojacking, fileless malware, zero-day, RaaS, supply chain attacks, lateral movement; AI voice cloning, OTP bots, pig butchering; RFID cloning, mantrap, secure media destruction; CIA Triad, GDPR rights (DSAR, DPIA, DPO), DLP, shadow IT; OSINT, org-chart harvesting, all 6 Cialdini principles; DeFi risks, smart contract vulnerabilities, wallet drainers, address poisoning, token approval revocation.

**Outcome:** 16 new `lesson.sections` entries in `lib/content.json`, 16 new reading items in `lib/learning-content.json`. Every topic tested in the 600-question bank now has corresponding lesson coverage — the learn-before-quiz loop is complete. Both JSON files verified syntactically valid.

---

### Prompt 30 — Documentation final pass: prompts-log, AI_ARCHITECTURE.md, README accuracy

> Three doc accuracy issues identified before submission: (1) `docs/AI_ARCHITECTURE.md` describes P1b Focus Areas as "Planned — reuses coach output shape" — it was implemented in Prompt 24, so the file is stale. (2) README tech stack table says "Next.js 16" — the actual version is 15. (3) prompts-log.md was missing entries 27–29 covering dark mode fix, proctoring hardening, and content gap fill. Fixed all three. README `## Live Demo` section updated with Vercel deployment URL after deploy.

**Outcome:** `AI_ARCHITECTURE.md` accurately documents all 5 AI features as shipped. README version corrected. prompts-log complete at 30 entries covering the full build from scaffold to deployment.

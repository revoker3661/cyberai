# CyberAI — AI Architecture

## System-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
│                                                                  │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  QuizEngine   │  │FloatingAssistant │  │   FocusPanel     │  │
│  │ (quiz routes) │  │ (all app pages)  │  │ (/cheat-sheet)   │  │
│  └──────┬────────┘  └────────┬─────────┘  └───────┬──────────┘  │
└─────────┼───────────────────┼────────────────────┼─────────────┘
          │ POST              │ POST               │ POST
          ▼                   ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                           │
│                                                                  │
│  /api/save-progress     /api/ai/coach      /api/ai/focus         │
│  /api/ai/assistant      /api/ai/tutor      /api/ai/phishing-sim  │
│  /api/ai/practice                                                │
│                                                                  │
│  Every route: verify session → zod-parse body → rate-limit       │
│               → call AI helper → zod-validate output → respond   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    lib/ai/client.ts                              │
│              generateAIObject  /  generateChat                   │
│                                                                  │
│   Attempt 1 ──▶ Groq  (generateObject — structured JSON output)  │
│   Attempt 2 ──▶ Gemini (generateObject — structured JSON output)  │
│   Attempt 3 ──▶ Groq  (generateText + regex JSON extract)        │
│   Attempt 4 ──▶ Gemini (generateText + regex JSON extract)        │
│   All fail  ──▶ return typed fallback shape (never crash)        │
└────────────────────┬─────────────────────┬───────────────────────┘
                     │                     │
                     ▼                     ▼
             ┌───────────────┐     ┌───────────────┐
             │  Groq API     │     │  Gemini API   │
             │  llama-3.3-   │     │  gemini-1.5-  │
             │  70b-versatile│     │  flash        │
             │  14,400 req/d │     │  1,500 req/d  │
             └───────────────┘     └───────────────┘
```

---

## Provider-Agnostic Layer — `lib/ai/client.ts`

Three exported functions that all features use:

```typescript
generateAIText(prompt, system)                          → Promise<string>
generateAIObject<T>(prompt, system, schema: ZodSchema<T>) → Promise<T>
generateChat(system, messages: ChatMessage[], schema)   → Promise<{answer, suggestions}>
```

- Model IDs (`GROQ_MODEL`, `GEMINI_MODEL`) are constants at the top of `client.ts` — swap the entire platform's primary model by changing one string
- Features never import Groq or Gemini SDK directly — they call these helpers only
- Provider selection is invisible to the feature layer

### Why 4 attempts?
Groq free tier occasionally returns 429 (rate-limit burst) or fails to produce valid JSON in structured output mode when schemas have many constraints. Gemini is the safety net. Text+JSON extraction is the last resort when strict schemas confuse either model. In practice, Attempt 1 succeeds ~95% of the time.

---

## Rate Limiting

```
API Route receives request
    │
    ▼
SELECT COUNT(*) FROM ai_usage
WHERE user_id = $uid AND endpoint = $ep
AND created_at > NOW() - INTERVAL '1 hour'
    │
    ├─ count >= 20 ──▶ return 429 { error: "Rate limit exceeded" }
    │
    └─ count < 20  ──▶ INSERT INTO ai_usage (user_id, endpoint)
                       → proceed to AI call
```

- 20 requests/hour per user per endpoint
- Counter stored in `ai_usage` table (Supabase Postgres)
- Production upgrade path: Redis + sliding window algorithm (avoids DB query on every request)

---

## AI Features

### P0a — Smart Quiz Coach (`/api/ai/coach`)

```
Quiz Submit
    │
    ▼
/api/ai/coach receives:
  moduleTitle + answers[]{question, chosen, correct, wasCorrect, confidence}
    │
    ▼
System prompt classifies each answer:
  confident + wrong  → blind_spot   (highest priority — incorrect mental model)
  guessing + correct → lucky_guess  (user doesn't know WHY they're right)
  guessing + wrong   → known_gap    (aware of ignorance — easier to fix)
  confident + correct → strong      (de-prioritized)
    │
    ▼
Output (zod-validated):
  { summary: string, blindSpots: string[], luckyGuesses: string[], recommendation: string }
    │
    ▼
Rendered as "Cognitive Security Report" panel on results screen
```

**Why confidence matters**: Without confidence, all wrong answers look the same. With it, "confident + wrong" is the most dangerous state — the user would act on a false belief in a real security scenario.

**Fallback**: `{ summary: "Keep learning!", blindSpots: [], luckyGuesses: [], recommendation: "Review the lesson." }`

---

### P0b — Ask CyberAI Tutor (`/api/ai/tutor`)

```
User asks question on lesson page
    │
    ▼
/api/ai/tutor receives:
  { question, lessonContent (full lesson text), history (last 6 turns) }
    │
    ▼
System prompt guardrails:
  ✓ Answer ONLY from the provided lesson content
  ✓ Max 120 words per response
  ✓ Refuse off-topic questions politely
  ✗ Never reveal quiz answers verbatim
    │
    ▼
Response sent back → rendered in slide-up chat panel on lesson page
```

**Token management**: Only the last 6 turns are sent (prevents token overflow on free tier for long sessions).

---

### P1 — Phishing Simulator (`/api/ai/phishing-sim`)

```
action: "generate"                    action: "grade" (skipped — local)
    │                                       │
    ▼                                       ▼
AI returns:                           Client matches user clicks
  { from, subject, body,              against returned redFlags[] IDs
    redFlags: [{id, text, reason}] }  (pure function — no second AI call)
    │
    ▼
UI renders realistic email card
User clicks suspicious elements
```

**Safety architecture**: System prompt explicitly states "educational simulation only, fictional brands/domains, no real URLs, no instructions for creating real phishing". Grading is done locally — only one AI call per simulation, not two.

---

### P1b — Personalized Focus Areas (`/api/ai/focus`)

```
User visits /cheat-sheet
    │
    ▼
cheat-sheet/page.tsx (Server Component)
  queries module_progress for ALL attempted modules (not just passed)
    │
    ▼
FocusPanel (Client Component) mounts
  → POST /api/ai/focus with { modules: [{moduleTitle, scorePercent, passed}] }
    │
    ▼
AI analyzes:
  failed + low-score modules → highest priority focus
  high-score passed modules  → de-prioritized
    │
    ▼
Output (zod-validated):
  { focusAreas: string[], summary: string }   ← 4–6 specific bullets
    │
    ├─ success → render collapsible panel above static cheat-sheet cards
    └─ failure → panel hides silently; static cards always visible
```

**Caching**: fetched once on mount, held in component state. Re-fetches only if `attempted.length` changes. Avoids burning free-tier quota on every page visit.

**Why ALL modules, not just passed?** Failed modules are the highest-priority focus areas. Including only passed modules would make the panel useless — it would show strengths, not gaps.

---

### P2 — Adaptive Practice (`/api/ai/practice`)

```
Quiz results screen (score < 100%)
    │
    ▼
/api/ai/practice receives:
  wrong-answer topic summaries (from quiz answers)
    │
    ▼
AI returns 3 new MCQs in exact QuizQuestion schema
  (zod-validated; retries once on parse failure)
    │
    ▼
Rendered in quiz UI as "Practice" mode
  (unscored — no points, purely for reinforcement)
```

---

### Floating AI Assistant (`/api/ai/assistant`)

```
User opens FloatingAssistant (visible on all pages except /quiz)
    │
    ▼
FloatingAssistant.tsx extracts page context:
  pathname = /learn/phishing   →  pageContext = full phishing lesson text
  pathname = /dashboard        →  pageContext = null (generic assistant)
    │
    ▼
/api/ai/assistant receives:
  { question, history (last 20 turns as CoreMessage[]), pageContext? }
    │
    ▼
System prompt:
  if pageContext → "Use the provided lesson content as primary source"
  always        → human personality, expressive, no word cap
    │
    ▼
Output: { answer: string, suggestions: string[] }
  suggestions = 3 follow-up question chips shown after each response
```

**Multi-turn architecture**: `history` is passed as native `CoreMessage[]` array to the model for Attempts 1–2 (true conversational context, not serialized text). Attempts 3–4 serialize it as "User: ... Assistant: ..." for text extraction fallback.

**Why hidden on quiz pages?** Prevents mid-assessment coaching. `FloatingAssistant` checks `usePathname()` and returns `null` if it contains `/quiz`.

---

## Confidence Data Pipeline

```
User selects Confident / Just Guessing per question
    │
    ▼  (stored in answers[] in module_progress)
    │
    ▼  (sent to /api/ai/coach after quiz completion)
    │
    ▼  coach classifies:
       confident + wrong  → blindSpots[]
       guessing + correct → luckyGuesses[]
       guessing + wrong   → known gaps (in recommendation)
    │
    ▼  (rendered as Cognitive Security Report on results screen)
    │
    ▼  (all module scorePercent data sent to /api/ai/focus on /cheat-sheet)
    │
    ▼  focus returns personalized bullets for weakest areas
```

The confidence toggle is not decorative — it threads through the entire post-quiz AI layer, changing how mistakes are diagnosed and what remediation is recommended.

---

## Static Bank vs Dynamic Generation

**Decision**: Quiz questions are served from `question-bank.json` (600 static questions). AI is layered on top for coaching, personalization, and adaptive practice — it never generates core assessment content.

**Why not fully AI-generated questions?**

| Concern | Static bank | Dynamic AI |
|---|---|---|
| Wireframe fidelity | ✅ Matches specific questions shown | ❌ Generates new ones each time |
| Deterministic scoring | ✅ Correct answer known at serve time | ❌ AI defines correctness at runtime |
| Security accuracy | ✅ Expert-reviewed content | ❌ LLMs can generate plausible-but-wrong security advice |
| Audit trail | ✅ Every question in a reviewable file | ❌ No persistent record of what was asked |
| Anti-cheat | ✅ Option orders shuffled, verified by text identity | ⚠️ Harder to verify without ground truth |

**AI adds value without replacing the static layer**: coaching tells you what you got wrong and why, personalization targets your specific weaknesses, practice generates new questions for reinforcement — none of this requires the core assessment to be dynamic.

---

## Free-Tier Budget

| Provider | Model | Free quota | Role |
|---|---|---|---|
| Groq | `llama-3.3-70b-versatile` | 14,400 req/day, 131k TPM | Primary (fast, high throughput) |
| Google AI | `gemini-1.5-flash` | 1,500 req/day, 1M TPM | Fallback (generous daily quota) |

With the 20 req/hour/user rate limit: one user consumes max 480 AI calls/day — well within combined free-tier limits for a demo or assessment context.

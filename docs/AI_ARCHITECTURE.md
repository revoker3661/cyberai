# CyberAI — AI Architecture

## Provider-Agnostic Layer

All LLM calls flow through `lib/ai/client.ts` using the **Vercel AI SDK**:

```
User Action → API Route → lib/ai/client.ts → Groq (primary) ──→ Response
                                           └→ Gemini (fallback, on 429/error)
```

- **Primary**: Groq `llama-3.3-70b-versatile` — free tier, fast inference (~200 tok/s)
- **Fallback**: Google Gemini `gemini-1.5-flash` — free tier, generous quota
- Model IDs are constants in `client.ts`, not hardcoded per-feature
- Provider switch is transparent — features never know which model ran

## AI Features

### P0a — Smart Quiz Coach (`/api/ai/coach`)
**Purpose**: Turns the confidence toggle into actionable learning intelligence.

**Input**: Module title + per-question `{question, chosen, correct, wasCorrect, confidence}`

**Classification logic** (in system prompt):
- **Blind Spots**: `confident + wrong` → highest priority, user has incorrect mental model
- **Lucky Guesses**: `guessing + correct` → user doesn't know why they're right
- **Known Gaps**: `guessing + wrong` → aware of ignorance, easier to fix

**Output schema** (zod-validated):
```ts
{ summary: string, blindSpots: string[], luckyGuesses: string[], recommendation: string }
```

**Fallback**: Static encouraging message if AI fails

**Why confidence matters**: Without confidence data, wrong answers look identical. With it, "confident wrong" is far more dangerous than "guessing wrong" — the coach prioritizes accordingly.

### P0b — Ask CyberAI Tutor (`/api/ai/tutor`)
**Purpose**: Floating lesson chat that stays on-topic.

**Guardrails** in system prompt:
- Answer ONLY using the provided lesson content as primary source
- Max 120 words per response
- Refuse off-topic questions politely, redirect to lesson
- Never reveal quiz answers verbatim

**Context window management**: Last 6 conversation turns sent (prevents token overflow on free tier)

### P1 — Phishing Simulator (`/api/ai/phishing-sim`)
**Safety architecture**:
- System prompt explicitly states "educational simulation only, fictional brands/domains, no real URLs"
- AI generates email + red flags; grading is done locally against returned `redFlags[]` (cheaper, more reliable)
- Only one AI call per simulation (generate), grading is pure function

### P1b — Personalized Focus Areas (`/api/ai/focus`)  
*(Planned — reuses coach output shape)*

### P2 — Adaptive Practice (`/api/ai/practice`)
- Sends wrong-topic summaries → AI returns 3 new MCQs
- zod-validates exact `QuizQuestion` schema, retries once on failure
- Rendered as "Practice" in quiz UI — unscored, no points awarded

## Rate Limiting

Per-user, per-endpoint counter in `ai_usage` table:
- 20 requests/hour per endpoint
- Simple SQL count query over rolling 1-hour window
- Production upgrade path: Redis + sliding window (noted in README)

## Free-Tier Strategy

| Provider | Model | Free Limit |
|---|---|---|
| Groq | llama-3.3-70b-versatile | 14,400 req/day, 131k TPM |
| Google AI | gemini-1.5-flash | 1,500 req/day, 1M TPM |

With our 20 req/hour/user rate limit, a single user can consume max 480 AI calls/day — well within free tier for a demo/assessment context.

## Static Bank vs Dynamic Generation

**Decision**: Quiz questions are 100% from `content.json` (static bank). AI is layered on top for coaching and practice.

**Why not fully dynamic questions?**
1. **Wireframe fidelity**: The assessment explicitly requires matching wireframes — specific questions are shown
2. **Deterministic scoring**: `score = correct ? points : 0` requires knowing the answer ahead of time
3. **No hallucinated answers**: LLMs can generate plausible-but-wrong explanations for security topics (dangerous in a training context)
4. **Audit trail**: Static questions can be reviewed by subject matter experts

**AI adds value without replacing the static layer**: coaching, personalization, and practice — not core assessment.

## Confidence Data Pipeline

```
User selects Confident/Just Guessing
    ↓ stored in answers[] in module_progress
    ↓ sent to /api/ai/coach after quiz
    ↓ classified into blind spots / lucky guesses / known gaps
    ↓ rendered as Cognitive Security Report on results screen
    ↓ (future) feeds /api/ai/focus on cheat-sheet page
```

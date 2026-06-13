import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAIObject } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { PASS_THRESHOLD } from "@/lib/game";

const bodySchema = z.object({
  moduleTitle: z.string().max(200),
  passed: z.boolean().optional(),
  questions: z.array(z.object({
    topic: z.string().max(200),
    chosen: z.string().max(500),
    correct: z.string().max(500),
    wasCorrect: z.boolean(),
    confidence: z.enum(["confident", "guessing"]),
  })).max(20),
});

const outputSchema = z.object({
  headline: z.string(),
  overallComment: z.string(),
  blindSpots: z.array(z.object({ topic: z.string(), advice: z.string() })),
  luckyGuesses: z.array(z.object({ topic: z.string(), advice: z.string() })),
  nextSteps: z.array(z.string()),
});

const SYSTEM = `You are a cybersecurity training coach. Analyze the user's quiz attempt by cross-referencing CORRECTNESS with CONFIDENCE.

Classify each question:
- "blind_spot": CONFIDENT + WRONG → highest risk; they don't know what they don't know
- "lucky_guess": GUESSING + CORRECT → fragile knowledge, needs reinforcement
- "solid": CONFIDENT + CORRECT → mastered
- "known_gap": GUESSING + WRONG → known weakness, study needed

Write an encouraging but honest Cognitive Security Report. Be direct about blind spots — they're dangerous in security. Name specific topics. Suggest concrete next steps.

Output ONLY valid JSON matching: { headline, overallComment, blindSpots: [{topic, advice}], luckyGuesses: [{topic, advice}], nextSteps: [string] }`;

function computeLocalFallback(questions: Array<{topic:string;wasCorrect:boolean;confidence:string}>, passed: boolean) {
  const blindSpots = questions
    .filter((q) => q.confidence === "confident" && !q.wasCorrect)
    .map((q) => ({ topic: q.topic.slice(0, 80), advice: "Review this concept carefully — you were confident but got it wrong." }));

  const luckyGuesses = questions
    .filter((q) => q.confidence === "guessing" && q.wasCorrect)
    .map((q) => ({ topic: q.topic.slice(0, 80), advice: "You guessed correctly, but solidify this knowledge by reviewing the lesson." }));

  return {
    headline: passed ? "Good work! Some areas need reinforcement." : `Keep studying — you need ${Math.round(PASS_THRESHOLD * 100)}% to pass.`,
    overallComment: blindSpots.length > 0
      ? "You have some blind spots — areas where you were confident but incorrect. These are the most important to address."
      : "Your confidence levels are well-calibrated. Focus on reinforcing the areas you guessed on.",
    blindSpots,
    luckyGuesses,
    nextSteps: [
      "Re-read the lesson sections covering your blind spots.",
      "Use the Cheat Sheet for a quick reference of key concepts.",
      ...(passed ? [] : ["Retake the quiz once you've reviewed the material."]),
    ],
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "coach");
  if (!allowed) return NextResponse.json(computeLocalFallback([], false));

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(computeLocalFallback([], false));

  const { moduleTitle, passed = true, questions } = parsed.data;

  const prompt = `Module: "${moduleTitle}" · Result: ${passed ? "PASSED" : "FAILED"}

Quiz answers:
${questions.map((q, i) =>
  `Q${i + 1}: "${q.topic}"
  Chosen: "${q.chosen}"
  Correct: "${q.correct}"
  Result: ${q.wasCorrect ? "CORRECT" : "WRONG"} · Confidence: ${q.confidence.toUpperCase()}`
).join("\n\n")}`;

  try {
    const result = await generateAIObject(prompt, SYSTEM, outputSchema);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(computeLocalFallback(questions, passed));
  }
}

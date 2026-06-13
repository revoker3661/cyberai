import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAIObject } from "@/lib/ai/client";
import { coachOutputSchema } from "@/lib/ai/schemas";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  moduleTitle: z.string().max(200),
  questions: z.array(z.object({
    question: z.string(),
    chosen: z.string(),
    correct: z.string(),
    wasCorrect: z.boolean(),
    confidence: z.enum(["confident", "guessing"]),
  })).max(20),
});

const SYSTEM = `You are a friendly, encouraging cybersecurity coach. Analyze the user's quiz performance and classify mistakes.
Blind spots = confident + wrong (highest priority). Lucky guesses = guessing + correct (should revisit). Known gaps = guessing + wrong.
Keep your summary under 180 words total. Be warm and specific. Reference lesson concepts by name.
Return ONLY valid JSON matching the schema: { summary, blindSpots: string[], luckyGuesses: string[], recommendation: string }`;

const FALLBACK = {
  summary: "Great effort on the quiz! Review the areas where you struggled to strengthen your understanding.",
  blindSpots: [],
  luckyGuesses: [],
  recommendation: "Revisit the lesson materials and pay special attention to the concepts you found challenging.",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "coach");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(FALLBACK);

  const { moduleTitle, questions } = parsed.data;

  const prompt = `Module: "${moduleTitle}"\n\nAnswers:\n${questions.map((q, i) =>
    `Q${i + 1}: "${q.question}"\n  Chosen: "${q.chosen}"\n  Correct: "${q.correct}"\n  Result: ${q.wasCorrect ? "CORRECT" : "WRONG"}\n  Confidence: ${q.confidence.toUpperCase()}`
  ).join("\n\n")}`;

  try {
    const result = await generateAIObject(prompt, SYSTEM, coachOutputSchema);
    return NextResponse.json(result);
  } catch {
    try {
      const result = await generateAIObject(prompt, SYSTEM, coachOutputSchema);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(FALLBACK);
    }
  }
}

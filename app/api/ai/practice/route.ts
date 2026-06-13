import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAIObject } from "@/lib/ai/client";
import { practiceOutputSchema } from "@/lib/ai/schemas";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  moduleTitle: z.string().max(200),
  weakTopics: z.array(z.string().max(200)).max(10),
});

const SYSTEM = `You are creating adaptive practice questions for cybersecurity training.
Generate exactly 3 multiple-choice practice questions targeting the user's weak areas.
Questions must be NEW (not verbatim from lessons), educational, and have exactly 4 options.
Mark these as practice — no points are awarded.
Return JSON: { questions: [{ question, options: [4 strings], correctIndex: 0-3, explanation }] }`;

const FALLBACK = {
  questions: [
    {
      question: "Which of these is a sign that an email might be a phishing attempt?",
      options: ["It contains the company logo", "It uses your real name", "It creates urgency to act immediately", "It comes from a known contact"],
      correctIndex: 2,
      explanation: "Phishing emails often create a false sense of urgency to pressure you into acting without thinking carefully.",
    },
  ],
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "practice");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(FALLBACK);

  const { moduleTitle, weakTopics } = parsed.data;

  const prompt = `Module: "${moduleTitle}"\nTopics the user struggled with:\n${weakTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nGenerate 3 practice questions targeting these weak areas.`;

  try {
    const result = await generateAIObject(prompt, SYSTEM, practiceOutputSchema);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}

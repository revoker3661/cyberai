import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAIObject } from "@/lib/ai/client";

const bodySchema = z.object({
  modules: z.array(z.object({
    moduleTitle: z.string(),
    scorePercent: z.number(),
    passed: z.boolean(),
  })).min(1),
});

const focusSchema = z.object({
  focusAreas: z.array(z.string()).min(2).max(8),
  summary: z.string(),
});

type FocusOutput = z.infer<typeof focusSchema>;

const FALLBACK: FocusOutput = {
  focusAreas: [
    "Review modules where your score was below 80% and re-read the cheat sheet takeaways.",
    "Pay special attention to questions you answered by guessing — those indicate knowledge gaps.",
    "Focus on the highest-point modules first as they contribute most to your overall attainment.",
    "Use the Lesson pages to revisit concepts before retaking any quiz.",
  ],
  summary: "Keep studying and retake quizzes to improve your security knowledge.",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { modules } = parsed.data;

  const failed = modules.filter((m) => !m.passed);
  const low = modules.filter((m) => m.passed && m.scorePercent < 80);
  const notStarted = 8 - modules.length;

  const prompt = `
The learner has completed ${modules.length} of 8 cybersecurity training modules.

Results:
${modules.map((m) => `- ${m.moduleTitle}: ${m.scorePercent}% (${m.passed ? "PASSED" : "FAILED"})`).join("\n")}
${notStarted > 0 ? `- ${notStarted} module(s) not yet started` : ""}

Failed modules: ${failed.length > 0 ? failed.map((m) => m.moduleTitle).join(", ") : "None"}
Low-scoring passed modules (under 80%): ${low.length > 0 ? low.map((m) => `${m.moduleTitle} (${m.scorePercent}%)`).join(", ") : "None"}

Generate 4-6 specific, actionable focus area bullets. Each bullet should name a specific module or topic and explain exactly what to study or practice. Be direct and concrete.
Also write a one-sentence summary of the learner's overall situation.
`;

  const system = `You are a cybersecurity learning coach. Analyze a learner's quiz results and identify their top focus areas.
Be specific — name the exact module and the type of improvement needed. Do not give generic advice.
Keep each focus area bullet under 100 characters.`;

  try {
    const result = await generateAIObject(prompt, system, focusSchema);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}

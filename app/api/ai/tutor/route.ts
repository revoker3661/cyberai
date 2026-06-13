import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAIText } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  question: z.string().max(500),
  moduleTitle: z.string().max(200),
  lessonContent: z.string().max(4000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(6).default([]),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "tutor");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { question, moduleTitle, lessonContent, history } = parsed.data;

  const system = `You are CyberAI Tutor, helping a learner understand "${moduleTitle}".
Use ONLY the provided lesson material as your primary source. Answer concisely (≤120 words).
If asked about topics outside this lesson, politely decline and redirect to the lesson topic.
Never reveal quiz answers verbatim. Be encouraging and clear.

LESSON CONTENT:
${lessonContent}`;

  const historyText = history.map((h) => `${h.role === "user" ? "User" : "Tutor"}: ${h.content}`).join("\n");
  const prompt = historyText ? `${historyText}\nUser: ${question}` : question;

  try {
    const answer = await generateAIText(prompt, system);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ answer: "I'm having trouble connecting right now. Please try again in a moment." });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateChat } from "@/lib/ai/client";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  pageContext: z.object({
    page: z.string(),
    moduleId: z.string().optional(),
    title: z.string().optional(),
    contentText: z.string().max(5000).optional(),
  }),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(20), // Keep up to 20 turns (10 back-and-forth)
  question: z.string().max(1000),
});

const outputSchema = z.object({
  answer: z.string(),
  suggestions: z.array(z.string()).min(1).max(3),
});

const SYSTEM = `You are CyberAI's assistant — a knowledgeable, warm, and genuinely conversational cybersecurity guide. Think of yourself as a smart friend who happens to know a lot about cybersecurity.

PERSONALITY & TONE:
- Warm, enthusiastic, and encouraging. Use natural expressions like "Great question!", "Oh, that's a really important one!", "Absolutely!", "Hmm, let me think about that..."
- Conversational — NOT robotic. Use contractions (it's, don't, you'll). Sound human.
- Show genuine interest: if they ask something interesting, say so!
- Match the user's energy — if they're casual, be casual. If they're asking for detail, go deep.
- Use emojis occasionally to keep it friendly 😊 but don't overdo it.

RESPONSE LENGTH (this is important):
- Let the QUESTION decide the length — you are smart enough to judge this yourself.
- Quick factual questions → 1-3 sentences, direct and punchy.
- "How does X work?" → 2-4 sentences with a real-world example.
- "Explain in detail" / "give me 500 words" / "tell me everything about" → Honor it fully. Write as much as needed.
- "What should I do?" → Practical steps, numbered if helpful.
- NEVER cut an explanation short when the user wants depth. Finish your thought.
- NEVER pad with filler when the user wants brevity.

CONVERSATION MEMORY:
You receive the full conversation history as native messages — USE IT. Reference earlier things the user said. If they asked something before, build on it. Be coherent across the conversation, not amnesiac.

PAGE CONTEXT:
You know what page the user is on and what they're reading. Ground your answers in that specific content first, then expand. This is what makes you genuinely useful vs. a generic chatbot.

RULES:
- Stay on cybersecurity and the CyberAI platform. If someone goes off-topic, redirect warmly.
- NEVER give, hint at, or confirm quiz answers. If asked, say something like "I can't help with specific quiz answers — that would defeat the purpose of learning! But I can explain the concept 😄"
- The 3 suggestions should be specific, interesting follow-up questions about the current topic — not generic.

Output ONLY valid JSON (no markdown fences): {"answer": "...", "suggestions": ["...", "...", "..."]}`;

const FALLBACK: Record<string, string[]> = {
  "learn-module": ["Explain this topic in simple terms", "Give me a real-world example of this", "What's the most important thing to remember here?"],
  "learn": ["Which module should I start with?", "How long does each module take?", "What's the hardest topic to learn?"],
  "dashboard": ["How do I earn more points?", "What does the 70% pass threshold mean?", "How do I unlock my certificate?"],
  "cheat-sheet": ["What's the most important security habit?", "Explain phishing in simple terms", "How does 2FA actually protect me?"],
  "lesson": ["Summarize this lesson for me", "Give me a real-world example", "What are the key things to remember?"],
  "default": ["How can I stay safer online?", "What is phishing?", "Why are strong passwords important?"],
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "assistant");
  if (!allowed) return NextResponse.json({
    answer: "You've hit the rate limit — you're clearly very curious today! 😄 Give it a few minutes and ask away.",
    suggestions: FALLBACK.default,
  });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { pageContext, history, question } = parsed.data;

  // Build system prompt with page context injected
  const contextPart = [
    `CURRENT PAGE: ${pageContext.page}`,
    pageContext.title ? `USER IS VIEWING: ${pageContext.title}` : "",
    pageContext.contentText
      ? `\n--- LESSON/PAGE CONTENT THE USER IS READING ---\n${pageContext.contentText.slice(0, 4500)}\n---`
      : "",
  ].filter(Boolean).join("\n");

  const systemWithContext = `${SYSTEM}\n\n${contextPart}`;

  // Build native message array — full conversation history + current question
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const messages: ChatMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  try {
    const result = await generateChat(systemWithContext, messages, outputSchema);
    return NextResponse.json(result);
  } catch {
    const pageKey = Object.keys(FALLBACK).find((k) => pageContext.page.includes(k)) ?? "default";
    return NextResponse.json({
      answer: "Oops, I'm having a little trouble connecting right now! 😅 Try again in a moment — I promise I'll be more helpful then.",
      suggestions: FALLBACK[pageKey] ?? FALLBACK.default,
    });
  }
}

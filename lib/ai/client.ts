import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { ZodSchema } from "zod";

type ChatMessage = { role: "user" | "assistant"; content: string };

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GEMINI_MODEL = "gemini-1.5-flash";

export async function generateAIText(prompt: string, system: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system,
      prompt,
      maxOutputTokens: 600,
    });
    return text;
  } catch {
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      system,
      prompt,
      maxOutputTokens: 600,
    });
    return text;
  }
}

export async function generateAIObject<T>(
  prompt: string,
  system: string,
  schema: ZodSchema<T>
): Promise<T> {
  // Attempt 1: Groq structured output
  try {
    const { object } = await generateObject({
      model: groq(GROQ_MODEL),
      system,
      prompt,
      schema,
    });
    return object;
  } catch { /* fall through */ }

  // Attempt 2: Gemini structured output
  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      system,
      prompt,
      schema,
    });
    return object;
  } catch { /* fall through */ }

  // Attempt 3: Groq text + JSON parse (most compatible fallback)
  try {
    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: system + "\n\nYou MUST output ONLY a raw JSON object — no markdown, no code fences, no explanation.",
      prompt,
      maxOutputTokens: 900,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return schema.parse(JSON.parse(match[0]));
  } catch { /* fall through */ }

  // Attempt 4: Gemini text + JSON parse
  try {
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      system: system + "\n\nYou MUST output ONLY a raw JSON object — no markdown, no code fences, no explanation.",
      prompt,
      maxOutputTokens: 900,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return schema.parse(JSON.parse(match[0]));
  } catch { /* fall through */ }

  throw new Error("All AI providers failed");
}

/** Multi-turn chat: pass full conversation history as native CoreMessage[].
 *  This is the best approach — model sees real conversation context, not serialized text.
 *  Returns { answer, suggestions } or throws. */
export async function generateChat(
  system: string,
  messages: ChatMessage[],
  schema: ZodSchema<{ answer: string; suggestions: string[] }>
): Promise<{ answer: string; suggestions: string[] }> {
  // Attempt 1: Groq with native messages array
  try {
    const { object } = await generateObject({ model: groq(GROQ_MODEL), system, messages, schema });
    return object;
  } catch { /* fall through */ }

  // Attempt 2: Gemini with native messages array
  try {
    const { object } = await generateObject({ model: google(GEMINI_MODEL), system, messages, schema });
    return object;
  } catch { /* fall through */ }

  // Attempt 3: Groq text fallback — serialize messages manually
  try {
    const conv = messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: system + "\n\nOutput ONLY raw JSON: {\"answer\":\"...\",\"suggestions\":[\"...\",\"...\",\"...\"]}",
      prompt: conv,
      maxOutputTokens: 1200,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return schema.parse(JSON.parse(match[0]));
  } catch { /* fall through */ }

  // Attempt 4: Gemini text fallback
  try {
    const conv = messages.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
    const { text } = await generateText({
      model: google(GEMINI_MODEL),
      system: system + "\n\nOutput ONLY raw JSON: {\"answer\":\"...\",\"suggestions\":[\"...\",\"...\",\"...\"]}",
      prompt: conv,
      maxOutputTokens: 1200,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return schema.parse(JSON.parse(match[0]));
  } catch { /* fall through */ }

  throw new Error("All chat providers failed");
}

import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { ZodSchema } from "zod";

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
  try {
    const { object } = await generateObject({
      model: groq(GROQ_MODEL),
      system,
      prompt,
      schema,
    });
    return object;
  } catch {
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      system,
      prompt,
      schema,
    });
    return object;
  }
}

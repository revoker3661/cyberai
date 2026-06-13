import { z } from "zod";

export const coachOutputSchema = z.object({
  summary: z.string(),
  blindSpots: z.array(z.string()),
  luckyGuesses: z.array(z.string()),
  recommendation: z.string(),
});
export type CoachOutput = z.infer<typeof coachOutputSchema>;

export const practiceQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});
export const practiceOutputSchema = z.object({
  questions: z.array(practiceQuestionSchema).min(1).max(3),
});
export type PracticeOutput = z.infer<typeof practiceOutputSchema>;

export const phishingEmailSchema = z.object({
  from: z.string(),
  subject: z.string(),
  body: z.string(),
  redFlags: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      reason: z.string(),
    })
  ).min(3).max(5),
});
export type PhishingEmail = z.infer<typeof phishingEmailSchema>;

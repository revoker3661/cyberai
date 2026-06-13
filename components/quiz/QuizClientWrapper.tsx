"use client";
import dynamic from "next/dynamic";
import type { Module } from "@/lib/content";

// ssr: false must live in a Client Component — quiz page is a Server Component so
// this wrapper exists solely to own the dynamic import and prevent the hydration
// mismatch caused by Math.random() in buildServedQuestions running on the server.
const QuizEngineClient = dynamic(
  () => import("./QuizEngine").then((mod) => ({ default: mod.QuizEngine })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px] text-sm text-gray-400 dark:text-gray-500">
        Loading quiz…
      </div>
    ),
  }
);

export function QuizClientWrapper({ mod, userId }: { mod: Module; userId: string }) {
  return <QuizEngineClient mod={mod} userId={userId} />;
}

"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Bot, ChevronDown } from "lucide-react";
import rawLearnContent from "@/lib/learning-content.json";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PageContext {
  page: string;
  moduleId?: string;
  title?: string;
  contentText?: string;
}

type LearnBody = { type: string; text?: string; items?: Array<{ title?: string; text?: string }> };
type LearnItemRaw = { id: string; type: string; title: string; body?: LearnBody[]; description?: string };
type LearnModRaw = { sectionTitle?: string; items?: LearnItemRaw[] };

function extractLearnText(moduleId: string): string {
  const learn = (rawLearnContent as unknown as { modules: Record<string, LearnModRaw> }).modules[moduleId];
  if (!learn?.items) return "";
  return learn.items.map((item) => {
    const parts: string[] = [`## ${item.title}`];
    if (item.description) parts.push(item.description);
    if (item.body) {
      for (const b of item.body) {
        if (b.text) parts.push(b.text);
        if (b.items) parts.push(b.items.map((i) => `${i.title ? i.title + ": " : ""}${i.text ?? ""}`).join("\n"));
      }
    }
    return parts.join("\n");
  }).join("\n\n").slice(0, 4500);
}

function getPageContext(pathname: string): PageContext {
  if (pathname.startsWith("/learn/")) {
    const moduleId = pathname.split("/")[2];
    const contentText = extractLearnText(moduleId);
    const learn = (rawLearnContent as unknown as { modules: Record<string, LearnModRaw> }).modules[moduleId];
    return { page: "learn-module", moduleId, title: learn?.sectionTitle ?? moduleId, contentText };
  }
  if (pathname === "/learn") return { page: "learn", title: "Learn — all 8 cybersecurity modules" };
  if (pathname.startsWith("/modules/") && pathname.endsWith("/lesson")) {
    const moduleId = pathname.split("/")[2];
    return { page: "lesson", moduleId, title: `Lesson: ${moduleId}` };
  }
  if (pathname.startsWith("/modules/") && pathname.endsWith("/review")) {
    const moduleId = pathname.split("/")[2];
    return { page: "quiz-review", moduleId, title: `Quiz Review: ${moduleId}` };
  }
  if (pathname === "/dashboard") return { page: "dashboard", title: "Dashboard — training progress and module status" };
  if (pathname === "/cheat-sheet") return { page: "cheat-sheet", title: "Security Cheat Sheet" };
  if (pathname === "/badges") return { page: "badges", title: "Badges & achievements" };
  if (pathname === "/certificate") return { page: "certificate", title: "Certificate page" };
  if (pathname === "/profile") return { page: "profile", title: "Profile & stats" };
  return { page: "general", title: "CyberAI cybersecurity training platform" };
}

const INITIAL_SUGGESTIONS: Record<string, string[]> = {
  "learn-module": ["Explain this topic in simple terms", "Give me a real-world example", "What's the most important thing to remember?"],
  "learn": ["Which module should I start with?", "How long does each module take?", "What's covered in this course?"],
  "lesson": ["Summarize this lesson", "Give me a real-world example", "What are the key takeaways?"],
  "dashboard": ["How do I earn more points?", "What does the 70% pass threshold mean?", "How do I unlock my certificate?"],
  "cheat-sheet": ["What's the most important security habit?", "Explain phishing simply", "How does 2FA actually work?"],
  "default": ["How can I stay safer online?", "What is phishing?", "Why do strong passwords matter?"],
};

export function FloatingAssistant() {
  const pathname = usePathname();

  // Disable completely on quiz pages
  const isQuizPage = pathname.includes("/quiz") && !pathname.includes("/review");
  if (isQuizPage) return null;

  return <AssistantWidget pathname={pathname} />;
}

function AssistantWidget({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  // Keep the FULL conversation history — never truncate what user sees
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageCtx = getPageContext(pathname);

  // Reset suggestions when page changes (but keep message history for the session)
  useEffect(() => {
    const key = Object.keys(INITIAL_SUGGESTIONS).find((k) => pageCtx.page.includes(k)) ?? "default";
    setSuggestions(INITIAL_SUGGESTIONS[key] ?? INITIAL_SUGGESTIONS.default);
  }, [pageCtx.page]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageContext: pageCtx,
          // Send full history as native turns — the server uses CoreMessage[] array
          // Cap at last 20 to stay within token limits, but keep all 20 (not just 5)
          history: updatedMessages.slice(0, -1).slice(-20),
          question: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const answer = data.answer ?? "Sorry, something went wrong!";
        setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.slice(0, 3));
        }
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "Oops, I'm having a little trouble right now! 😅 Try again in a moment.",
        }]);
        setSuggestions(INITIAL_SUGGESTIONS.default);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Connection issue — please check your internet and try again! 🙏",
      }]);
      setSuggestions(INITIAL_SUGGESTIONS.default);
    }

    setLoading(false);
  }

  const contextLabel = pageCtx.title ?? pageCtx.page;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[92vw] sm:w-[400px] max-h-[78vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Bot size={18} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">CyberAI Assistant</p>
                <p className="text-[10px] opacity-75 truncate">Helping with: {contextLabel}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white ml-2 flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <Bot size={32} className="mx-auto text-indigo-400 mb-2" />
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Hey! I&apos;m your CyberAI assistant 👋</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Ask me anything about what you&apos;re studying — I can explain concepts, give examples, and help you understand the material!
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                      <Bot size={12} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div className={`max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {suggestions.length > 0 && !loading && (
            <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800 text-left leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask anything…"
              disabled={loading}
              className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-60"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 w-[52px] h-[52px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open AI assistant"
      >
        {open ? <ChevronDown size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}

"use client";
import { Share2, Check } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = `I just earned the "${title}" badge on CyberAI! 🛡️ Improving my cybersecurity skills.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "CyberAI Badge", text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

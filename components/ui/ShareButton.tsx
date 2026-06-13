"use client";
import { Share2, Check } from "lucide-react";
import { useState } from "react";

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function buildBadgeImage(title: string, hexAccent: string): Promise<File | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background card
    ctx.fillStyle = "#ffffff";
    drawRoundRect(ctx, 0, 0, 400, 400, 28);
    ctx.fill();

    // Accent tint overlay
    ctx.fillStyle = hexAccent + "18";
    drawRoundRect(ctx, 0, 0, 400, 400, 28);
    ctx.fill();

    // Badge circle
    ctx.fillStyle = hexAccent + "28";
    ctx.beginPath();
    ctx.arc(200, 155, 88, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hexAccent + "55";
    ctx.beginPath();
    ctx.arc(200, 155, 70, 0, Math.PI * 2);
    ctx.fill();

    // Shield emoji
    ctx.font = "60px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🛡️", 200, 155);

    // "BADGE EARNED" label
    ctx.fillStyle = hexAccent;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.letterSpacing = "2px";
    ctx.fillText("BADGE EARNED", 200, 268);

    // Module title (word-wrapped)
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.letterSpacing = "0px";
    const words = title.split(" ");
    let line = "";
    let y = 296;
    for (const word of words) {
      const test = line + (line ? " " : "") + word;
      if (ctx.measureText(test).width > 340) {
        ctx.fillText(line, 200, y);
        line = word;
        y += 30;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, 200, y);

    // Divider line
    ctx.strokeStyle = hexAccent + "44";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 370);
    ctx.lineTo(340, 370);
    ctx.stroke();

    // CyberAI branding
    ctx.fillStyle = "#64748b";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText("CyberAI · Cybersecurity Training", 200, 394);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    return new File([blob], "cyberai-badge.png", { type: "image/png" });
  } catch {
    return null;
  }
}

export function ShareButton({ title, hexAccent }: { title: string; hexAccent: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = `I just earned the "${title}" badge on CyberAI! 🛡️ Improving my cybersecurity skills.`;

    // Try share with image
    if (typeof navigator !== "undefined" && navigator.canShare) {
      const file = await buildBadgeImage(title, hexAccent);
      if (file && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "CyberAI Badge", text });
          return;
        } catch {}
      }
    }

    // Fallback: share text only
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "CyberAI Badge", text });
        return;
      } catch {}
    }

    // Final fallback: clipboard
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

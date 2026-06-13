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

async function buildBadgeImage(title: string, hexAccent: string, userName: string): Promise<File | null> {
  try {
    const W = 480, H = 480;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // --- Background ---
    ctx.fillStyle = "#f8fafc";
    drawRoundRect(ctx, 0, 0, W, H, 32);
    ctx.fill();

    // Top accent banner
    ctx.fillStyle = hexAccent;
    drawRoundRect(ctx, 0, 0, W, 110, 32);
    ctx.fill();
    ctx.fillStyle = hexAccent;
    ctx.fillRect(0, 78, W, 32);

    // "CERTIFICATE OF ACHIEVEMENT" in banner
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", W / 2, 55);

    // CyberAI logo line in banner
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("CyberAI · Cybersecurity Training Platform", W / 2, 80);

    // --- Badge circle ---
    ctx.fillStyle = hexAccent + "18";
    ctx.beginPath();
    ctx.arc(W / 2, 192, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexAccent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(W / 2, 192, 68, 0, Math.PI * 2);
    ctx.stroke();

    // Star burst (8 small triangles around circle)
    ctx.fillStyle = hexAccent + "44";
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const x1 = W / 2 + Math.cos(angle) * 68;
      const y1 = 192 + Math.sin(angle) * 68;
      const x2 = W / 2 + Math.cos(angle - 0.2) * 82;
      const y2 = 192 + Math.sin(angle - 0.2) * 82;
      const x3 = W / 2 + Math.cos(angle + 0.2) * 82;
      const y3 = 192 + Math.sin(angle + 0.2) * 82;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    }

    // Shield emoji inside circle
    ctx.font = "54px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🛡️", W / 2, 192);

    // --- Module title ---
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textBaseline = "top";
    const words = title.split(" ");
    let line = "";
    let y = 286;
    for (const word of words) {
      const test = line + (line ? " " : "") + word;
      if (ctx.measureText(test).width > 400) {
        ctx.fillText(line, W / 2, y);
        line = word;
        y += 30;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, W / 2, y);

    // --- "Awarded to" section ---
    const awardedY = y + (words.length > 3 ? 64 : 46);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("Awarded to", W / 2, awardedY);

    ctx.fillStyle = hexAccent;
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(userName, W / 2, awardedY + 20);

    // --- Bottom divider + branding ---
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, H - 46);
    ctx.lineTo(W - 40, H - 46);
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(`cyberai.app · ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}`, W / 2, H - 12);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return null;
    return new File([blob], "cyberai-badge.png", { type: "image/png" });
  } catch {
    return null;
  }
}

export function ShareButton({ title, hexAccent, userName }: { title: string; hexAccent: string; userName: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = `I just earned the "${title}" badge on CyberAI! 🛡️ Improving my cybersecurity skills.`;

    // Try share with canvas-generated badge image
    if (typeof navigator !== "undefined" && navigator.canShare) {
      const file = await buildBadgeImage(title, hexAccent, userName);
      if (file && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "CyberAI Badge", text });
          return;
        } catch {}
      }
    }

    // Fallback: share text only (desktop browsers)
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

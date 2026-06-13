"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";

export function BadgesConfetti({ count }: { count: number }) {
  useEffect(() => {
    if (count === 0) return;
    // Burst from both sides
    confetti({ particleCount: 60, spread: 70, origin: { x: 0.2, y: 0.6 } });
    confetti({ particleCount: 60, spread: 70, origin: { x: 0.8, y: 0.6 } });
  }, [count]);

  return null;
}

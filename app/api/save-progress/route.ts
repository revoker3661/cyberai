import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getModule } from "@/lib/content";
import { isPassed } from "@/lib/game";

const bodySchema = z.object({
  moduleId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedIndex: z.number().int(),
    correct: z.boolean(),
    confidence: z.enum(["confident", "guessing"]),
    topic: z.string().optional(),
    chosenText: z.string().optional(),
    correctText: z.string().optional(),
  })),
  servedQuestionIds: z.array(z.string()),
  optionOrders: z.record(z.string(), z.array(z.string())),
  maxServedPoints: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { moduleId, answers, servedQuestionIds, optionOrders, maxServedPoints } = parsed.data;
  const mod = getModule(moduleId);
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  // Recompute score server-side — never trust client score
  // Match each answer's questionId against the served set to get per-question points
  const servedCount = servedQuestionIds.length;
  const pts = Math.floor(mod.maxPoints / servedCount);
  const remainder = mod.maxPoints - pts * servedCount;

  const score = answers.reduce((sum, a, i) => {
    const isServed = servedQuestionIds.includes(a.questionId);
    if (!isServed) return sum;
    const q = mod.quiz.find((q) => q.id === a.questionId);
    if (!q) return sum;
    // Verify correctness using original question (trust original correct answer, not client)
    const servedOptions = optionOrders[a.questionId];
    let actuallyCorrect = false;
    if (servedOptions) {
      const selectedText = servedOptions[a.selectedIndex];
      const correctText = q.options[q.correctIndex];
      actuallyCorrect = selectedText === correctText;
    } else {
      actuallyCorrect = a.selectedIndex === q.correctIndex;
    }
    const qPoints = i >= servedCount - remainder ? pts + 1 : pts;
    const confMultiplier = actuallyCorrect && a.confidence === "confident" ? 1.25 : 1;
    return sum + (actuallyCorrect ? Math.round(qPoints * confMultiplier) : 0);
  }, 0);

  const passed = isPassed(score, maxServedPoints);

  // Upsert — keep best passing score; if already passed, don't downgrade
  const { data: existing } = await supabase
    .from("module_progress")
    .select("score, passed")
    .eq("user_id", user.id)
    .eq("module_id", moduleId)
    .single();

  const shouldUpdate = !existing || !existing.passed || score > existing.score;

  if (shouldUpdate) {
    await supabase.from("module_progress").upsert(
      {
        user_id: user.id,
        module_id: moduleId,
        score,
        max_score: mod.maxPoints,
        max_served_points: maxServedPoints,
        passed,
        answers,
        served_question_ids: servedQuestionIds,
        option_orders: optionOrders,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id" }
    );
  }

  // Certificate: only when all 8 modules are PASSED
  if (passed) {
    const { count } = await supabase
      .from("module_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("passed", true);

    if ((count ?? 0) >= 8) {
      const { data: existing } = await supabase
        .from("certificates")
        .select("cert_id")
        .eq("user_id", user.id)
        .single();

      if (!existing) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const certId = "CERT-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        await supabase.from("certificates").insert({ user_id: user.id, cert_id: certId });
      }
    }
  }

  return NextResponse.json({ ok: true, score, maxServedPoints, passed });
}

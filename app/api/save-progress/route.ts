import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getModule } from "@/lib/content";

const bodySchema = z.object({
  moduleId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedIndex: z.number().int(),
    correct: z.boolean(),
    confidence: z.enum(["confident", "guessing"]),
  })),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { moduleId, answers } = parsed.data;
  const mod = getModule(moduleId);
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  // Recompute score server-side from answers — never trust client score
  const score = answers.reduce((sum, a) => {
    const q = mod.quiz.find((q) => q.id === a.questionId);
    return sum + (a.correct && q && a.selectedIndex === q.correctIndex ? q.points : 0);
  }, 0);

  await supabase.from("module_progress").upsert(
    {
      user_id: user.id,
      module_id: moduleId,
      score,
      max_score: mod.maxPoints,
      answers,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id" }
  );

  // Check if all 8 modules complete → generate certificate if not yet existing
  const { count } = await supabase
    .from("module_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

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

  return NextResponse.json({ ok: true, score });
}

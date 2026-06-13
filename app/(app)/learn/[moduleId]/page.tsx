export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getModule, getLearnModule } from "@/lib/content";
import { LearnPlayer } from "@/components/learn/LearnPlayer";

export default async function LearnModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mod = getModule(moduleId);
  const learnMod = getLearnModule(moduleId);
  if (!mod || !learnMod) notFound();

  const { data: lessonRows } = await supabase
    .from("lesson_progress")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("module_id", moduleId);

  const completedItemIds = new Set((lessonRows ?? []).map((r: { item_id: string }) => r.item_id));

  return (
    <LearnPlayer
      mod={mod}
      learnMod={learnMod}
      userId={user.id}
      completedItemIds={[...completedItemIds]}
    />
  );
}

"use server";
import { createClient } from "@/lib/supabase/server";

export async function markItemComplete(userId: string, moduleId: string, itemId: string) {
  const supabase = await createClient();
  await supabase.from("lesson_progress").upsert(
    { user_id: userId, module_id: moduleId, item_id: itemId, completed_at: new Date().toISOString() },
    { onConflict: "user_id,module_id,item_id" }
  );
}

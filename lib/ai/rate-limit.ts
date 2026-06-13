import { createServiceClient } from "@/lib/supabase/server";

const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
  try {
    const supabase = await createServiceClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("ai_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .gte("created_at", since);

    if ((count ?? 0) >= LIMIT) return false;

    await supabase.from("ai_usage").insert({ user_id: userId, endpoint });
    return true;
  } catch {
    return true;
  }
}

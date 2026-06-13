export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/content";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Award, Lock, Mail, Zap, Phone, Globe, Trash2, Users, Bitcoin } from "lucide-react";
import { ShareButton } from "@/components/ui/ShareButton";

const ICON_MAP: Record<string, LucideIcon> = {
  mail: Mail, lock: Lock, zap: Zap, phone: Phone,
  globe: Globe, "trash-2": Trash2, users: Users, bitcoin: Bitcoin,
};

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id")
    .eq("user_id", user.id);

  const completed = new Set((progressRows ?? []).map((r: { module_id: string }) => r.module_id));

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Award className="text-amber-500" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Badges</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and share your hard-earned achievements.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const unlocked = completed.has(mod.id);
          const Icon = ICON_MAP[mod.icon] ?? Award;

          return (
            <div
              key={mod.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm relative transition-all ${
                !unlocked ? "opacity-60" : ""
              }`}
            >
              {!unlocked && (
                <div className="absolute top-3 right-3">
                  <Lock size={14} className="text-gray-400" />
                </div>
              )}
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{
                  backgroundColor: unlocked ? mod.hexAccent + "22" : "#e5e7eb",
                }}
              >
                <Icon size={36} style={{ color: unlocked ? mod.hexAccent : "#9ca3af" }} />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2 leading-tight">{mod.title}</p>
              {unlocked ? (
                <ShareButton title={mod.title} hexAccent={mod.hexAccent} />
              ) : (
                <span className="text-xs text-gray-400">Complete to unlock</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

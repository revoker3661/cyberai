export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/content";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CheckCircle, Mail, Lock, Zap, Phone, Globe, Trash2, Users, Bitcoin } from "lucide-react";
import { PrintButton } from "@/components/ui/PrintButton";
import { FocusPanel } from "@/components/ai/FocusPanel";

const ALL_MODULES = MODULES;

const ICON_MAP: Record<string, LucideIcon> = {
  mail: Mail, lock: Lock, zap: Zap, phone: Phone,
  globe: Globe, "trash-2": Trash2, users: Users, bitcoin: Bitcoin,
};

export default async function CheatSheetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, score, max_served_points, passed")
    .eq("user_id", user.id);

  const allRows = (progressRows ?? []) as { module_id: string; score: number; max_served_points: number | null; passed: boolean }[];
  const passedIds = new Set(allRows.filter((r) => r.passed).map((r) => r.module_id));
  const completedModules = MODULES.filter((m) => passedIds.has(m.id));

  // Build data for FocusPanel (all attempted modules)
  const focusModules = allRows.map((r) => {
    const mod = ALL_MODULES.find((m) => m.id === r.module_id);
    const denom = r.max_served_points ?? mod?.maxPoints ?? 1;
    return {
      moduleTitle: mod?.title ?? r.module_id,
      scorePercent: Math.round((r.score / denom) * 100),
      passed: r.passed,
    };
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="text-indigo-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Cheat Sheet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A quick reference of key takeaways from your completed modules.
          </p>
        </div>
      </div>

      {/* P1b — Personalized Focus Areas (AI-powered, above cheat-sheet cards) */}
      {focusModules.length > 0 && (
        <FocusPanel modules={focusModules} />
      )}

      {completedModules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-10 text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete training modules to unlock cheat sheet entries.
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {completedModules.map((mod) => {
            const Icon = ICON_MAP[mod.icon] ?? BookOpen;
            return (
              <div
                key={mod.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700"
                  style={{ borderLeftColor: mod.hexAccent, borderLeftWidth: 4 }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: mod.hexAccent + "22" }}
                  >
                    <Icon size={20} style={{ color: mod.hexAccent }} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{mod.title}</h3>
                </div>
                <ul className="p-4 space-y-2">
                  {mod.cheatSheet.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {completedModules.length > 0 && (
        <div className="no-print">
          <PrintButton />
        </div>
      )}
    </div>
  );
}

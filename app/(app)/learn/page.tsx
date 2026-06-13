export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/content";
import { LEARN_MODULES } from "@/lib/content";
import type { LucideIcon } from "lucide-react";
import {
  GraduationCap, BookOpen, PlayCircle, ArrowRight,
  Mail, Lock, Zap, Phone, Globe, Trash2, Users, Bitcoin,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  mail: Mail, lock: Lock, zap: Zap, phone: Phone,
  globe: Globe, "trash-2": Trash2, users: Users, bitcoin: Bitcoin,
};

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lessonRows } = await supabase
    .from("lesson_progress")
    .select("module_id, item_id")
    .eq("user_id", user.id);

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, score, max_served_points, passed")
    .eq("user_id", user.id);

  const progressMap = new Map(
    (progressRows ?? []).map((r: { module_id: string; score: number; max_served_points: number | null; passed: boolean }) => [r.module_id, r])
  );

  // Count completed lesson items per module
  const lessonCompletedMap = new Map<string, Set<string>>();
  for (const row of lessonRows ?? []) {
    const r = row as { module_id: string; item_id: string };
    if (!lessonCompletedMap.has(r.module_id)) lessonCompletedMap.set(r.module_id, new Set());
    lessonCompletedMap.get(r.module_id)!.add(r.item_id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="text-indigo-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learn</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Coursera-style lessons and videos for each module
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map((mod) => {
          const learn = LEARN_MODULES[mod.id];
          const Icon = ICON_MAP[mod.icon] ?? BookOpen;
          const totalItems = learn?.items.length ?? 0;
          const completedItems = lessonCompletedMap.get(mod.id)?.size ?? 0;
          const prog = progressMap.get(mod.id);
          const quizPassed = prog?.passed ?? false;
          const quizScore = prog?.score ?? 0;
          const quizMax = prog?.max_served_points ?? mod.maxPoints;
          const lessonPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
          const videoCount = learn?.items.filter((i) => i.type === "video").length ?? 0;
          const readingCount = learn?.items.filter((i) => i.type === "reading").length ?? 0;
          const totalMin = learn?.items.reduce((s, i) => s + i.estMinutes, 0) ?? 0;

          return (
            <Link
              key={mod.id}
              href={`/learn/${mod.id}`}
              className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="h-1.5" style={{ backgroundColor: mod.hexAccent }} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: mod.hexAccent + "22" }}>
                    <Icon size={22} style={{ color: mod.hexAccent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {learn?.sectionSubtitle ?? "Cybersecurity training"}
                    </p>
                  </div>
                </div>

                {/* Item counts */}
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-500 dark:text-gray-400">
                  {readingCount > 0 && (
                    <span className="flex items-center gap-1">
                      <BookOpen size={11} /> {readingCount} reading{readingCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {videoCount > 0 && (
                    <span className="flex items-center gap-1">
                      <PlayCircle size={11} /> {videoCount} video{videoCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {totalMin > 0 && <span>~{totalMin} min</span>}
                </div>

                {/* Lessons progress */}
                {totalItems > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Lessons</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{completedItems}/{totalItems}</span>
                    </div>
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${lessonPct}%`, backgroundColor: mod.hexAccent }} />
                    </div>
                  </div>
                )}

                {/* Quiz state */}
                {prog ? (
                  <p className={`text-xs font-medium mt-1 ${quizPassed ? "text-emerald-600" : "text-red-500"}`}>
                    Quiz: {quizPassed ? "✓ Passed" : "✗ Not Passed"} · {quizScore}/{quizMax} pts
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Quiz: Not started</p>
                )}

                <div className="mt-3 flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 gap-1 transition-all">
                  Open module <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MODULES } from "@/lib/content";
import { calcLevel, calcOverallProgress, calcScoreAttainment, getLevelTitle } from "@/lib/game";
import { CircularGauge } from "@/components/ui/CircularGauge";
import type { LucideIcon } from "lucide-react";
import {
  Star, BookOpen, Medal, ArrowRight,
  Mail, Lock, Zap, Phone, Globe, Trash2, Users, Bitcoin,
  CheckCircle, AlertTriangle, RefreshCw,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  mail: Mail, lock: Lock, zap: Zap, phone: Phone,
  globe: Globe, "trash-2": Trash2, users: Users, bitcoin: Bitcoin,
};

function ModuleIcon({ icon, hexAccent }: { icon: string; hexAccent: string }) {
  const Icon = ICON_MAP[icon] ?? BookOpen;
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: hexAccent + "22" }}>
      <Icon size={22} style={{ color: hexAccent }} />
    </div>
  );
}

type ProgressRow = { module_id: string; score: number; max_score: number; max_served_points: number | null; passed: boolean };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, score, max_score, max_served_points, passed")
    .eq("user_id", user.id);

  const progressMap = new Map<string, ProgressRow>(
    (progressRows ?? []).map((r: ProgressRow) => [r.module_id, r])
  );

  const passedModules = [...progressMap.values()].filter((r) => r.passed).length;
  const totalEarned = [...progressMap.values()]
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + r.score, 0);

  const overallPct = Math.round(calcOverallProgress(passedModules) * 100);
  const attainmentPct = calcScoreAttainment(totalEarned);
  const level = calcLevel(passedModules);
  const levelTitle = getLevelTitle(level);
  const allPassed = passedModules === 8;

  const nextModule = MODULES.find((m) => !progressMap.get(m.id)?.passed);
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Learner";

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      {allPassed ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-1">🎉 All Complete!</p>
          <h2 className="text-2xl font-bold mb-1">Training Complete, {displayName}!</h2>
          <p className="text-sm opacity-80 mb-4">You&apos;ve passed all 8 modules. Claim your certificate!</p>
          <Link href="/certificate" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-5 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
            View Certificate <ArrowRight size={16} />
          </Link>
        </div>
      ) : nextModule ? (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">UP NEXT</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{nextModule.title}</h2>
              <p className="text-sm opacity-80">Earn up to {nextModule.maxPoints} pts · Need 70% to pass</p>
            </div>
            <Link
              href={`/modules/${nextModule.id}/lesson`}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors text-sm whitespace-nowrap"
            >
              Start Lesson <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Overall Progress card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="text-yellow-400" size={20} />
          <h3 className="font-semibold text-gray-900 dark:text-white">Overall Progress</h3>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div className="bg-indigo-600 h-3 rounded-full transition-all duration-700" style={{ width: `${overallPct}%` }} />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{overallPct}%</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
            <BookOpen className="text-indigo-500 mx-auto mb-1" size={22} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{passedModules} / 8</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Modules Passed</p>
            <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
              <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${(passedModules / 8) * 100}%` }} />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
            <Medal className="text-amber-500 mx-auto mb-1" size={22} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEarned}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Points Earned</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col items-center">
            <div className="relative">
              <CircularGauge percent={attainmentPct} size={80} strokeWidth={8} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-gray-900 dark:text-white">{attainmentPct}%</span>
                <span className="text-[9px] text-gray-500 leading-tight text-center">Score<br/>Attainment</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Overall Score Progress</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-indigo-950 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-indigo-300">Lv. {level}</p>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">LEVEL</p>
          </div>
          <div className="bg-emerald-950 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-emerald-400">{levelTitle}</p>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">STATUS</p>
          </div>
        </div>
      </div>

      {/* Training Modules */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-500" /> Training Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map((mod) => {
            const prog = progressMap.get(mod.id);
            const attempted = !!prog;
            const passed = prog?.passed ?? false;
            const scoreNum = prog?.score ?? 0;
            const maxPts = prog?.max_served_points ?? mod.maxPoints;
            const scorePct = attempted ? (scoreNum / maxPts) * 100 : 0;

            return (
              <div key={mod.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: mod.hexAccent }} />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <ModuleIcon icon={mod.icon} hexAccent={mod.hexAccent} />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{mod.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Earn up to {mod.maxPoints} pts · 70% to pass</p>
                    </div>
                  </div>

                  {passed ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle size={12} /> Completed
                        </span>
                        <Link href={`/modules/${mod.id}/review`} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                          Review Quiz <ArrowRight size={11} />
                        </Link>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Score: <strong>{scoreNum} / {maxPts} pts</strong>
                      </p>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                        <div className="h-1.5 rounded-full" style={{ width: `${scorePct}%`, backgroundColor: mod.hexAccent }} />
                      </div>
                      <Link
                        href={`/modules/${mod.id}/lesson`}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800"
                      >
                        <CheckCircle size={14} /> Lesson Completed
                      </Link>
                    </>
                  ) : attempted ? (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <AlertTriangle size={12} /> Not Passed
                        </span>
                        <Link href={`/modules/${mod.id}/review`} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                          Review Quiz <ArrowRight size={11} />
                        </Link>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Score: <strong>{scoreNum} / {maxPts} pts</strong> · Need 70%
                      </p>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                        <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${scorePct}%` }} />
                      </div>
                      <Link
                        href={`/modules/${mod.id}/quiz`}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: mod.hexAccent }}
                      >
                        <RefreshCw size={14} /> Retake Quiz
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`/modules/${mod.id}/lesson`}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
                      style={{ backgroundColor: mod.hexAccent }}
                    >
                      <BookOpen size={14} /> Start Lesson
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

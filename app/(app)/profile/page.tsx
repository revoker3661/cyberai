export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/content";
import { calcLevel, calcScoreAttainment, getLevelTitle } from "@/lib/game";
import { User, Medal, BookOpen, Star } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("score, module_id, passed")
    .eq("user_id", user.id);

  const rows = progressRows ?? [];
  const completed = rows.filter((r: { passed: boolean }) => r.passed).length;
  const totalEarned = rows.reduce((sum: number, r: { score: number }) => sum + r.score, 0);
  const level = calcLevel(completed);
  const levelTitle = getLevelTitle(level);
  const attainment = calcScoreAttainment(totalEarned);
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Learner";
  const email = user.email ?? "";
  const initial = displayName[0].toUpperCase();

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>

      {/* User card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {initial}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Star size={16} className="text-yellow-400" /> Training Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
            <BookOpen className="mx-auto text-indigo-500 mb-1" size={22} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completed} / {MODULES.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Modules Completed</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
            <Medal className="mx-auto text-amber-500 mb-1" size={22} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEarned}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Points</p>
          </div>
          <div className="bg-indigo-950 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-indigo-300">Lv. {level}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">Level</p>
          </div>
          <div className="bg-emerald-950 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-emerald-400">{attainment}%</p>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">Score Attainment</p>
          </div>
        </div>
      </div>

      {/* Level badge */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <User size={28} className="text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{levelTitle}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Security Rank</p>
        </div>
      </div>
    </div>
  );
}

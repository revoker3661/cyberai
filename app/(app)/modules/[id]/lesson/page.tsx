export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getModule } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, BookOpen, CheckCircle, Mail, Lock, Zap, Phone, Globe, Trash2, Users, Bitcoin } from "lucide-react";
import { TutorButton } from "@/components/ai/TutorButton";

const ICON_MAP: Record<string, LucideIcon> = {
  mail: Mail, lock: Lock, zap: Zap, phone: Phone,
  globe: Globe, "trash-2": Trash2, users: Users, bitcoin: Bitcoin,
};

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = getModule(id);
  if (!mod) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progress } = await supabase
    .from("module_progress")
    .select("score, max_score")
    .eq("user_id", user.id)
    .eq("module_id", id)
    .single();

  const completed = !!progress;
  const Icon = ICON_MAP[mod.icon] ?? BookOpen;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="h-1.5" style={{ backgroundColor: mod.hexAccent }} />
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: mod.hexAccent + "22" }}
          >
            <Icon size={28} style={{ color: mod.hexAccent }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{mod.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Lesson Materials</p>
          </div>
        </div>

        {/* Lesson content */}
        <div className="p-6 space-y-6">
          {mod.lesson.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">{section.heading}</h2>
              {section.body && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{section.body}</p>
              )}
              {section.bullets && (
                <ul className="space-y-3 mt-2">
                  {section.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: mod.hexAccent }} />
                      <span>
                        <strong className="text-gray-900 dark:text-white">{b.title}: </strong>
                        {b.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          {completed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={14} /> Lesson Completed</span>
                <span>Score: {progress.score} / {mod.maxPoints} pts</span>
              </div>
              <Link
                href={`/modules/${id}/quiz`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: mod.hexAccent }}
              >
                Retake Quiz ({mod.maxPoints} pts)
              </Link>
            </div>
          ) : (
            <Link
              href={`/modules/${id}/quiz`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: mod.hexAccent }}
            >
              Start Quiz ({mod.maxPoints} pts)
            </Link>
          )}
        </div>
      </div>

      {/* Floating tutor button */}
      <TutorButton moduleId={id} moduleTitle={mod.title} lessonContent={mod.lesson} />
    </div>
  );
}

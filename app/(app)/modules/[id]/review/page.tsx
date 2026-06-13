export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getModule } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { QuizEngine } from "@/components/quiz/QuizEngine";
import { ArrowLeft } from "lucide-react";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = getModule(id);
  if (!mod) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progress } = await supabase
    .from("module_progress")
    .select("answers, score")
    .eq("user_id", user.id)
    .eq("module_id", id)
    .single();

  if (!progress) redirect(`/modules/${id}/quiz`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
          Review Mode — Read Only
        </span>
      </div>
      <QuizEngine
        mod={mod}
        userId={user.id}
        readOnly
        existingAnswers={progress.answers as Parameters<typeof QuizEngine>[0]["existingAnswers"]}
      />
    </div>
  );
}

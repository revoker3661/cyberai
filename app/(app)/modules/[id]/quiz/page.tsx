export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { getModule } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { QuizEngine } from "@/components/quiz/QuizEngine";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mod = getModule(id);
  if (!mod) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="py-2">
      <QuizEngine mod={mod} userId={user.id} />
    </div>
  );
}

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MODULES } from "@/lib/content";
import { Lock, FileText } from "lucide-react";
import { CertificateView } from "@/components/ui/CertificateView";

export default async function CertificatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, passed")
    .eq("user_id", user.id);

  const passedCount = (progressRows ?? []).filter((r: { passed: boolean }) => r.passed).length;
  const allDone = passedCount >= MODULES.length;

  const { data: cert } = allDone
    ? await supabase
        .from("certificates")
        .select("cert_id, issued_at")
        .eq("user_id", user.id)
        .single()
    : { data: null };

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Learner";

  if (!allDone) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-10">
          <Lock size={48} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Certificate Locked</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Pass all 8 modules with ≥70% to unlock your certificate.
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-5">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>Modules Passed</span>
              <span className="font-semibold">{passedCount} / 8</span>
            </div>
            <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${(passedCount / 8) * 100}%` }}
              />
            </div>
          </div>
          <a
            href="/dashboard"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Continue Training
          </a>
        </div>
      </div>
    );
  }

  return (
    <CertificateView
      displayName={displayName}
      certId={cert?.cert_id ?? "CERT-XXXXXXXX"}
      issuedAt={cert?.issued_at ?? new Date().toISOString()}
    />
  );
}

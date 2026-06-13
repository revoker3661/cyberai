import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { SidebarWrapper } from "@/components/shell/SidebarWrapper";
import { FloatingAssistant } from "@/components/ai/FloatingAssistant";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = user.user_metadata?.display_name ?? "";
  const email = user.email ?? "";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <SidebarWrapper userEmail={email} displayName={displayName} />
      </div>

      {/* Mobile nav */}
      <MobileNav userEmail={email} displayName={displayName} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 lg:pt-0 pt-14">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Global page-aware AI assistant */}
      <FloatingAssistant />
    </div>
  );
}

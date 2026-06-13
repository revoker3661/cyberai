"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ShieldCheck, LayoutDashboard, User, Award, FileText, BookOpen,
  Sun, Moon, LogOut, Menu, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/certificate", label: "Certificate", icon: FileText },
  { href: "/cheat-sheet", label: "Cheat Sheet", icon: BookOpen },
];

interface MobileNavProps {
  userEmail: string;
  displayName: string;
}

export function MobileNav({ userEmail, displayName }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (displayName || userEmail || "U")[0].toUpperCase();

  return (
    <>
      {/* Top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center justify-between px-4 h-14 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-indigo-400" size={22} />
          <span className="font-bold text-lg">
            <span>Cyber</span><span className="text-red-400">AI</span>
          </span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={24} />
        </button>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-gray-900 text-white flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-indigo-400" size={24} />
                <span className="text-xl font-bold">
                  <span>Cyber</span><span className="text-red-400">AI</span>
                </span>
              </div>
              <button onClick={() => setOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="mx-3 my-3 bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{displayName || userEmail}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
            </div>

            <nav className="flex-1 px-2 py-2 space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-2 py-3 border-t border-gray-700 space-y-1">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white w-full"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ShieldCheck, LayoutDashboard, User, Award, FileText, BookOpen,
  Sun, Moon, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/certificate", label: "Certificate", icon: FileText },
  { href: "/cheat-sheet", label: "Cheat Sheet", icon: BookOpen },
];

interface SidebarProps {
  userEmail: string;
  displayName: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ userEmail, displayName, collapsed, onToggle }: SidebarProps) {
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
    <aside className={`
      flex flex-col h-full bg-gray-900 text-white transition-all duration-300
      ${collapsed ? "w-16" : "w-64"}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-indigo-400" size={26} />
            <span className="text-xl font-bold">
              <span className="text-white">Cyber</span>
              <span className="text-red-400">AI</span>
            </span>
          </div>
        )}
        {collapsed && <ShieldCheck className="text-indigo-400 mx-auto" size={24} />}
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors ml-auto"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User card */}
      {!collapsed && (
        <div className="mx-3 my-3 bg-gray-800 rounded-lg px-3 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName || userEmail}</p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: theme + logout */}
      <div className="px-2 py-3 border-t border-gray-700 space-y-1">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Toggle theme" : undefined}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white w-full transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

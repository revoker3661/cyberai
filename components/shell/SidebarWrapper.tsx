"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

interface SidebarWrapperProps {
  userEmail: string;
  displayName: string;
}

export function SidebarWrapper({ userEmail, displayName }: SidebarWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  if (pathname.includes("/quiz")) return null;

  return (
    <Sidebar
      userEmail={userEmail}
      displayName={displayName}
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
    />
  );
}

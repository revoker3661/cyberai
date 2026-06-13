"use client";
import { useState } from "react";
import { Sidebar } from "./Sidebar";

interface SidebarWrapperProps {
  userEmail: string;
  displayName: string;
}

export function SidebarWrapper({ userEmail, displayName }: SidebarWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Sidebar
      userEmail={userEmail}
      displayName={displayName}
      collapsed={collapsed}
      onToggle={() => setCollapsed((c) => !c)}
    />
  );
}

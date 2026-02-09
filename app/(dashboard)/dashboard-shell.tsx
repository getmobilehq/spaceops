"use client";

import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { UserRole } from "@/lib/types/database";

interface DashboardShellProps {
  profile: {
    id: string;
    org_id: string;
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
  };
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <Header />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav role={profile.role} />
    </div>
  );
}

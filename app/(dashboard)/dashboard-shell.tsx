"use client";

import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
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
    <div className="flex min-h-dvh bg-slate-50">
      {/* Desktop sidebar — hidden below lg */}
      <div className="hidden lg:block">
        <SidebarNav role={profile.role} userName={profile.name} />
      </div>

      {/* Main content area */}
      <div className="flex min-h-dvh flex-1 flex-col lg:ml-60">
        <Header />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        {/* Mobile bottom nav — hidden at lg+ */}
        <div className="lg:hidden">
          <BottomNav role={profile.role} />
        </div>
      </div>
    </div>
  );
}

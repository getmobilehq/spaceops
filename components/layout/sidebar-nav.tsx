"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Building2,
  ScanLine,
  ClipboardList,
  User,
  BarChart3,
  FileText,
  AlertTriangle,
  Bell,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Loader2,
  Search,
  Calendar,
} from "lucide-react";
import { GlobalSearch } from "@/components/search/global-search";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/database";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getNavSections(role: UserRole): NavSection[] {
  switch (role) {
    case "admin":
      return [
        {
          title: "Main",
          items: [
            { label: "Home", href: "/", icon: Home },
            { label: "Buildings", href: "/buildings", icon: Building2 },
            { label: "Scan", href: "/scan", icon: ScanLine },
            { label: "Tasks", href: "/tasks", icon: ClipboardList },
          ],
        },
        {
          title: "Operations",
          items: [
            { label: "Deficiencies", href: "/deficiencies", icon: AlertTriangle },
            { label: "Analytics", href: "/analytics", icon: BarChart3 },
            { label: "Reports", href: "/reports", icon: FileText },
            { label: "Notifications", href: "/notifications", icon: Bell },
          ],
        },
        {
          title: "Admin",
          items: [
            { label: "Users", href: "/admin/users", icon: Users },
            { label: "Checklists", href: "/admin/checklists", icon: ClipboardList },
            { label: "Schedules", href: "/admin/schedules", icon: Calendar },
            { label: "Settings", href: "/admin/settings", icon: Settings },
            { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
          ],
        },
      ];
    case "supervisor":
      return [
        {
          title: "Main",
          items: [
            { label: "Home", href: "/", icon: Home },
            { label: "Buildings", href: "/buildings", icon: Building2 },
            { label: "Scan", href: "/scan", icon: ScanLine },
            { label: "Tasks", href: "/tasks", icon: ClipboardList },
          ],
        },
        {
          title: "Operations",
          items: [
            { label: "Deficiencies", href: "/deficiencies", icon: AlertTriangle },
            { label: "Analytics", href: "/analytics", icon: BarChart3 },
            { label: "Schedules", href: "/admin/schedules", icon: Calendar },
            { label: "Reports", href: "/reports", icon: FileText },
            { label: "Notifications", href: "/notifications", icon: Bell },
          ],
        },
      ];
    case "client":
      return [
        {
          title: "Main",
          items: [
            { label: "Dashboard", href: "/client", icon: BarChart3 },
            { label: "Buildings", href: "/buildings", icon: Building2 },
            { label: "Reports", href: "/reports", icon: FileText },
          ],
        },
      ];
    case "staff":
      return [
        {
          title: "Main",
          items: [
            { label: "Home", href: "/staff", icon: Home },
            { label: "My Tasks", href: "/tasks", icon: ClipboardList },
            { label: "Alerts", href: "/notifications", icon: Bell },
          ],
        },
      ];
  }
}

interface SidebarNavProps {
  role: UserRole;
  userName: string;
}

export function SidebarNav({ role, userName }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sections = getNavSections(role);

  function isActive(href: string): boolean {
    if (href === "/" || href === "/client" || href === "/staff") return pathname === href;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-dvh w-60 flex-col border-r border-slate-800 bg-slate-950">
      {/* Logo */}
      <div className="flex h-14 items-center px-5">
        <Logo variant="dark" size="sm" />
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-200"
        >
          <Search className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            Cmd+K
          </kbd>
        </button>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section, i) => (
          <div key={section.title}>
            {i > 0 && <div className="my-2 border-t border-slate-800" />}
            <p className="mb-1 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-l-2 border-primary-500 bg-slate-800 text-primary-400"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Account section */}
      <div className="border-t border-slate-800 px-3 py-3">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive("/profile")
              ? "border-l-2 border-primary-500 bg-slate-800 text-primary-400"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          )}
        >
          <User className="h-5 w-5 shrink-0" />
          {userName}
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900 hover:text-red-400"
        >
          {loggingOut ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5 shrink-0" />
          )}
          Sign out
        </button>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </aside>
  );
}

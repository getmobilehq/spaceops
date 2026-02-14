"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  ScanLine,
  ClipboardList,
  User,
  BarChart3,
  FileText,
  AlertCircle,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isScan?: boolean;
}

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
    case "supervisor":
      return [
        { label: "Home", href: "/", icon: Home },
        { label: "Buildings", href: "/buildings", icon: Building2 },
        { label: "Scan", href: "/scan", icon: ScanLine, isScan: true },
        { label: "Tasks", href: "/tasks", icon: ClipboardList },
        { label: "More", href: "/more", icon: Menu },
      ];
    case "client":
      return [
        { label: "Dashboard", href: "/client", icon: BarChart3 },
        { label: "Buildings", href: "/buildings", icon: Building2 },
        { label: "Reports", href: "/reports", icon: FileText },
        { label: "Profile", href: "/profile", icon: User },
      ];
    case "staff":
      return [
        { label: "My Tasks", href: "/tasks", icon: ClipboardList },
        { label: "Alerts", href: "/notifications", icon: AlertCircle },
        { label: "Profile", href: "/profile", icon: User },
      ];
  }
}

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const items = getNavItems(role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/more"
                ? ["/more", "/profile", "/admin", "/deficiencies", "/reports", "/notifications"].some(
                    (p) => pathname.startsWith(p)
                  )
                : pathname.startsWith(item.href);

          if (item.isScan) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center"
              >
                <div className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 shadow-lg shadow-primary-500/30">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <span className="mt-0.5 text-[10px] font-medium text-slate-400">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3",
                isActive ? "text-primary-400" : "text-slate-500"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

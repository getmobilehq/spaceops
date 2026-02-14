"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

const SECTION_TITLES: [string, string][] = [
  ["/admin/users", "User Management"],
  ["/admin/checklists/", "Edit Checklist"],
  ["/admin/checklists", "Checklists"],
  ["/admin/settings", "Settings"],
  ["/deficiencies", "Deficiencies"],
  ["/reports", "Reports"],
  ["/notifications", "Notifications"],
  ["/profile", "Profile"],
  ["/more", "More"],
];

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const supabase = createBrowserSupabaseClient();
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      setUnreadCount(count ?? 0);
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine if we're in a section reachable from the More page
  const sectionTitle = SECTION_TITLES.find(([path]) =>
    pathname.startsWith(path)
  )?.[1];
  const showBackNav = sectionTitle && sectionTitle !== "More";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBackNav ? (
            <>
              <Link
                href="/more"
                className="-ml-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-h3 text-slate-900">{sectionTitle}</h1>
            </>
          ) : title ? (
            <h1 className="text-h3 text-slate-900">{title}</h1>
          ) : (
            <Logo size="sm" />
          )}
        </div>
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-5 w-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fail px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}

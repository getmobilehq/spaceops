import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreMenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  count?: number;
  variant?: "default" | "danger";
  children?: React.ReactNode;
}

export function MoreMenuItem({
  icon: Icon,
  label,
  href,
  count,
  variant = "default",
  children,
}: MoreMenuItemProps) {
  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          variant === "danger" ? "text-fail" : "text-slate-500"
        )}
      />
      <span
        className={cn(
          "flex-1 text-body font-semibold",
          variant === "danger" ? "text-fail" : "text-slate-700"
        )}
      >
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1.5 text-caption font-semibold text-primary-700">
          {count > 999 ? "999+" : count}
        </span>
      )}
      {children}
      {href && (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-slate-50 transition-colors">
        {content}
      </Link>
    );
  }

  return content;
}

export function MoreMenuSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-2 text-label uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {children}
      </div>
    </div>
  );
}

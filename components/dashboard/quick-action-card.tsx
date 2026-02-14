import Link from "next/link";

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  href: string;
}

export function QuickActionCard({
  icon: Icon,
  label,
  description,
  href,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-center transition-colors hover:border-primary-300 hover:bg-primary-50"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
        <Icon className="h-5 w-5 text-primary-700" />
      </div>
      <div>
        <p className="text-caption font-semibold text-slate-900">{label}</p>
        {description && (
          <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
        )}
      </div>
    </Link>
  );
}

import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { icon: "h-7 w-7 text-sm", text: "text-h3" },
  md: { icon: "h-9 w-9 text-h3", text: "text-h2" },
  lg: { icon: "h-11 w-11 text-h2", text: "text-h1" },
};

export function Logo({ variant = "light", size = "md", className }: LogoProps) {
  const s = sizes[size];
  const isDark = variant === "dark";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-primary-500 font-bold text-white",
          s.icon
        )}
      >
        S
      </div>
      <span className={cn("font-bold tracking-tight", s.text)}>
        <span className={isDark ? "text-white" : "text-slate-900"}>Space</span>
        <span className={isDark ? "text-primary-400" : "text-primary-600"}>
          Ops
        </span>
      </span>
    </div>
  );
}

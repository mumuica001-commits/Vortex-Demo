import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center gap-2.5 text-fg no-underline", className)}
    >
      <img
        src="/logo-mark.png"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-lg object-cover shadow-[var(--shadow-border)]"
      />
      <span className="font-display text-[15px] font-semibold tracking-[0.18em] uppercase">
        Vortex
      </span>
    </Link>
  );
}

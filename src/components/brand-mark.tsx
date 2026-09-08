import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-bg-subtle shadow-[var(--shadow-border)]">
        <svg viewBox="0 0 24 24" className="size-4 text-fg" aria-hidden>
          <rect x="3" y="5" width="11" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
          <rect x="12" y="10" width="9" height="8" rx="1.5" fill="currentColor" opacity="0.45" />
          <circle cx="19.2" cy="18.2" r="1.4" fill="#5eead4" />
        </svg>
      </span>
      <span className="font-display text-[15px] font-semibold tracking-[0.18em] uppercase">
        Vortex
      </span>
    </span>
  );
}

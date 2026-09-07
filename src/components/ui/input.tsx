import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl bg-bg-subtle px-3.5 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle",
        "transition-[box-shadow] duration-150 outline-none",
        "focus:shadow-[0_0_0_1px_rgb(216_221_230_/_0.45)]",
        className,
      )}
      {...props}
    />
  );
}

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function GlassPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-white/10 shadow-lg backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] dark:border-white/10 dark:bg-[hsl(var(--card)/0.5)]",
        className,
      )}
      {...props}
    />
  );
}

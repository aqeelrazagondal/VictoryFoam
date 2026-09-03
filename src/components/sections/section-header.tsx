import { createElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  as?: "h1" | "h2" | "h3";
  id?: string;
  align?: "left" | "center";
  gradient?: boolean;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  as = "h2",
  id,
  align = "left",
  gradient = false,
  className,
}: SectionHeaderProps) {
  return (
    <header className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {createElement(
        as,
        {
          id,
          className: cn(
            "font-heading font-semibold tracking-tight text-foreground",
            gradient && "gradient-text",
          ),
        },
        title,
      )}
      {subtitle && (
        <p className={cn("mt-4 text-muted-foreground", align === "center" && "mx-auto")}>
          {subtitle}
        </p>
      )}
    </header>
  );
}

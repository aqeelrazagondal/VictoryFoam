import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionWrapperProps = ComponentProps<"section"> & {
  background?: "default" | "muted" | "dark";
  children: ReactNode;
};

export function SectionWrapper({
  background = "default",
  className,
  children,
  ...props
}: SectionWrapperProps) {
  return (
    <section
      className={cn(
        "py-16 md:py-24",
        background === "muted" && "bg-secondary",
        background === "dark" && "bg-slate-950 text-slate-50",
        className,
      )}
      {...props}
    >
      <div className="container-site">{children}</div>
    </section>
  );
}

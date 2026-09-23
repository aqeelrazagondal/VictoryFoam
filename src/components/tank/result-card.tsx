"use client";

import type { ReactNode } from "react";

import { StatusBadge } from "@/components/tank/status-badge";
import type { FeasibilityStatus } from "@/lib/calculations";
import { cn } from "@/lib/utils";

export type ResultLine = {
  eyebrow: string;
  value: string;
  detail?: string;
};

export function ResultCard({
  status,
  statusLabel,
  message,
  lines,
  footer,
}: {
  status: FeasibilityStatus;
  statusLabel?: string;
  message?: string;
  lines: ResultLine[];
  footer?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        status === "feasible" && "border-emerald-500/30 bg-emerald-500/5",
        status === "warning" && "border-amber-500/30 bg-amber-500/5",
        status === "infeasible" && "border-destructive/30 bg-destructive/5",
      )}
    >
      <StatusBadge status={status} label={statusLabel} />
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      {status !== "infeasible"
        ? lines.map((line) => (
            <div key={line.eyebrow} className="mt-6">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {line.eyebrow}
              </p>
              <p className="hero-number mt-1 text-foreground">{line.value}</p>
              {line.detail ? (
                <p className="mt-2 text-sm text-muted-foreground">{line.detail}</p>
              ) : null}
            </div>
          ))
        : null}
      {footer ? <div className="mt-6">{footer}</div> : null}
    </section>
  );
}

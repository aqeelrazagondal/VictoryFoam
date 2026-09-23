"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { FeasibilityStatus } from "@/lib/calculations";
import { cn } from "@/lib/utils";

const STATUS = {
  feasible: {
    label: "Target achievable",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    label: "Low stock",
    icon: AlertTriangle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  infeasible: {
    label: "Not reachable",
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
} as const;

export function StatusBadge({
  status,
  label,
}: {
  status: FeasibilityStatus;
  label?: string;
}) {
  const config = STATUS[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium",
        config.className,
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label ?? config.label}
    </span>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-10 text-center">
      {icon ? <div className="mb-4 flex justify-center text-primary">{icon}</div> : null}
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild size="touch" className="mt-6">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
      {actionLabel && onAction ? (
        <Button size="touch" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TankLoading({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1>{title}</h1>
      <p className="text-muted-foreground">Loading…</p>
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40" aria-hidden="true" />
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function DeleteConfirm({
  children,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: {
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="mt-4 space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
      role="alertdialog"
      aria-labelledby="delete-confirm-title"
    >
      <p id="delete-confirm-title" className="font-medium text-foreground">
        Are you sure?
      </p>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="touch"
          variant="destructive"
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button type="button" size="touch" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

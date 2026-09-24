"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

function finePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function ScreenHelp({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      pinned.current = false;
      setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      pinned.current = false;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function closeIfUnpinned() {
    if (pinned.current) return;
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        if (finePointer()) setOpen(true);
      }}
      onMouseLeave={() => {
        if (finePointer()) closeIfUnpinned();
      }}
    >
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="About this screen"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!pinned.current) {
            pinned.current = true;
            setOpen(true);
            return;
          }
          pinned.current = false;
          setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next && rootRef.current?.contains(next)) return;
          if (!next && rootRef.current?.contains(document.activeElement)) return;
          pinned.current = false;
          setOpen(false);
        }}
      >
        <CircleHelp className="size-5" aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="About this screen"
          className="absolute left-0 top-full z-30 mt-1 w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-xl border border-border bg-popover p-3 text-sm leading-relaxed text-popover-foreground shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ScreenHeading({
  title,
  as: Tag = "h1",
  className,
  children,
}: {
  title: string;
  as?: "h1" | "h2";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <Tag className={className}>{title}</Tag>
      <ScreenHelp>{children}</ScreenHelp>
    </div>
  );
}

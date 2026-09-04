"use client";

import { scrollChapters } from "@/data/mattress-scroll";
import { cn } from "@/lib/utils";

export function ScrollProgress({
  progress,
  onJump,
}: {
  progress: number;
  onJump?: (target: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 md:right-6 md:block">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        <div className="relative h-48 w-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="absolute inset-x-0 top-0 origin-top rounded-full bg-gradient-to-b from-cyan-400 to-blue-500"
            style={{ height: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
          />
        </div>
        <ol className="flex flex-col gap-2" aria-label="Scroll chapters">
          {scrollChapters.map((chapter) => {
            const active = Math.abs(progress - chapter.progress) < 0.08;
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  aria-label={`Jump to ${chapter.label}`}
                  onClick={() => onJump?.(chapter.progress)}
                  className={cn(
                    "grid size-2.5 place-items-center rounded-full border transition-colors",
                    active
                      ? "border-primary bg-primary"
                      : "border-slate-600 bg-transparent hover:border-primary/60",
                  )}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

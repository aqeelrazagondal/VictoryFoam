"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { wizardSlide } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";

export type WizardStep = {
  id: string;
  label: string;
};

export function StepWizard({
  steps,
  currentIndex,
  onJump,
  children,
}: {
  steps: WizardStep[];
  currentIndex: number;
  onJump: (index: number) => void;
  children: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  const reached = steps.slice(0, currentIndex + 1);
  const currentId = steps[currentIndex]?.id ?? "step";

  return (
    <div className="space-y-5">
      <nav aria-label="Completed steps">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {reached.map((step, index) => (
            <li key={step.id} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              ) : null}
              <button
                type="button"
                onClick={() => onJump(index)}
                className={cn(
                  "min-h-11 rounded-full px-3 py-2 font-medium",
                  index === currentIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
                aria-current={index === currentIndex ? "step" : undefined}
              >
                {step.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {prefersReducedMotion ? (
        <div>{children}</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentId}
            variants={wizardSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

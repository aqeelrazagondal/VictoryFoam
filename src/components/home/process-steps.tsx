"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import { fadeInUp, staggerContainer } from "@/lib/motion-variants";

type WorkflowStep = {
  title: string;
  description: string;
};

export function ProcessSteps({ steps }: { steps: WorkflowStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-6 left-6 top-6 w-px bg-gradient-to-b from-primary via-primary/40 to-muted-foreground/30 lg:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-primary via-primary/40 to-muted-foreground/30 lg:block"
      />
      <motion.ol
        ref={ref}
        className="relative grid gap-8 lg:grid-cols-4 lg:gap-5"
        initial="hidden"
        animate={prefersReducedMotion || isInView ? "visible" : "hidden"}
        variants={prefersReducedMotion ? undefined : staggerContainer}
      >
        {steps.map((step, index) => (
          <motion.li
            key={step.title}
            className="relative grid grid-cols-[3rem_1fr] gap-4 lg:block lg:pt-20"
            variants={prefersReducedMotion ? undefined : fadeInUp}
          >
            <span className="gradient-border relative z-10 grid size-12 place-items-center rounded-full bg-background font-heading font-semibold text-foreground lg:absolute lg:top-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="glass-card rounded-xl p-5">
              <h3 className="font-heading text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>
    </div>
  );
}

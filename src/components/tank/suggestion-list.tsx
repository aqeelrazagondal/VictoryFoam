"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { Alternative } from "@/lib/calculations";

export function SuggestionList<TApply>({
  alternatives,
  onSelect,
  heading = "Try one of these instead",
}: {
  alternatives: Alternative<TApply>[];
  onSelect: (apply: TApply) => void;
  heading?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (alternatives.length === 0) return null;

  const list = (
    <div className="space-y-3">
      <h2 className="font-heading text-base font-semibold">{heading}</h2>
      <ul className="grid gap-2">
        {alternatives.map((item) => (
          <li key={item.id}>
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="h-auto min-h-12 w-full flex-col items-start gap-1 whitespace-normal py-3 text-left"
              onClick={() => onSelect(item.apply)}
            >
              <span className="font-medium">{item.title}</span>
              <span className="text-sm font-normal text-muted-foreground">{item.subtitle}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );

  if (prefersReducedMotion) return list;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {list}
    </motion.div>
  );
}

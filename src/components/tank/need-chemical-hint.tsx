"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPct } from "@/lib/calculations";
import type { MissingChemicalAdvice } from "@/lib/calculations";

export function NeedChemicalHint({ advice }: { advice: MissingChemicalAdvice }) {
  const threshold = formatPct(advice.targetPct);
  const edge = formatPct(advice.edgePct);
  const href = `/tank/chemicals/?suggestPct=${encodeURIComponent(String(advice.targetPct))}`;

  const title =
    advice.direction === "higher" ? "Add a stronger chemical" : "Add a weaker chemical";

  const message =
    advice.direction === "higher"
      ? advice.exclusive
        ? `None of your drums can raise the tank to ${threshold}. Your strongest is ${edge}. Add a chemical stronger than ${threshold} — a drum at exactly ${threshold} never quite gets there.`
        : `A mix can only land between the drums you have. Your strongest is ${edge}. To make ${threshold}, add a chemical at ${threshold} or higher.`
      : advice.exclusive
        ? `None of your drums can lower the tank to ${threshold}. Your weakest is ${edge}. Add a chemical weaker than ${threshold}.`
        : `A mix can only land between the drums you have. Your weakest is ${edge}. To make ${threshold}, add a chemical at ${threshold} or lower.`;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button asChild size="touch" className="w-full">
        <Link href={href}>Add chemical</Link>
      </Button>
    </div>
  );
}

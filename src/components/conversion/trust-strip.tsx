import { trustSignals } from "@/data/mattress-scroll";

export function TrustStrip() {
  return (
    <div className="border-y border-border/40 bg-secondary/40 dark:bg-[hsl(var(--card)/0.35)]">
      <div className="container-site overflow-x-auto py-4">
        <p className="text-center text-xs text-muted-foreground md:text-sm">
          {trustSignals.join(" · ")}
        </p>
      </div>
    </div>
  );
}

import { Clock, Flame, MapPin, Package, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { trustSignals } from "@/data/mattress-scroll";

const trustIcons: Record<(typeof trustSignals)[number], LucideIcon> = {
  "ISO 9001 Certified": ShieldCheck,
  "CertiPUR Approved": ShieldCheck,
  "BS 7177 Fire Safety": Flame,
  "South African Manufacturing": MapPin,
  "Sample Development": Package,
  "Practical Response Times": Clock,
};

export function TrustStrip() {
  return (
    <div className="border-y border-border/40 bg-secondary/40 dark:bg-[hsl(var(--card)/0.35)]">
      <div className="container-site py-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {trustSignals.map((signal) => {
            const Icon = trustIcons[signal];
            return (
              <li
                key={signal}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Icon className="size-4 text-primary" aria-hidden />
                {signal}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

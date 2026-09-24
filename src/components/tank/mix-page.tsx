"use client";

import Link from "next/link";

const LINKS = [
  {
    href: "/tank/blend/",
    label: "Blend",
    description: "Mix a fresh batch from two chemicals. No tank required.",
  },
  {
    href: "/tank/fill/",
    label: "Fill",
    description: "Add polyols so the tank hits a target quantity and solid content.",
  },
  {
    href: "/tank/planner/",
    label: "Planner",
    description: "See how a pour would change the tank before you log it.",
  },
] as const;

export function MixPage() {
  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1>Mix</h1>
        <p className="mt-2 text-muted-foreground">Blend a batch, fill the tank, or plan a pour.</p>
      </div>
      <ul className="space-y-3">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-2xl border border-border bg-card px-4 py-4 hover:bg-muted"
            >
              <p className="font-heading text-lg font-semibold">{link.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

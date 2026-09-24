"use client";

import Link from "next/link";

import { useTank } from "@/lib/tank/context";
import { cn } from "@/lib/utils";

const LINKS = [
  { id: "tank", href: "/tank/", label: "Tank" },
  { id: "inventory", href: "/tank/inventory/", label: "Inventory" },
  { id: "activity", href: "/tank/log/", label: "Activity" },
] as const;

export function TankContextNav({
  current,
}: {
  current: (typeof LINKS)[number]["id"];
}) {
  const { activeTank } = useTank();

  return (
    <nav aria-label="Factory section" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {activeTank ? (
          <li className="font-medium text-foreground">{activeTank.name}</li>
        ) : null}
        {LINKS.map((link, index) => (
          <li key={link.id} className="flex items-center gap-x-1">
            {activeTank || index > 0 ? <span aria-hidden="true">/</span> : null}
            {current === link.id ? (
              <span className="text-foreground">{link.label}</span>
            ) : (
              <Link
                href={link.href}
                className={cn("underline-offset-4 hover:underline")}
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

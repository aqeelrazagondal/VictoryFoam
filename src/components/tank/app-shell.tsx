"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CircleHelp, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";
import { useTank } from "@/lib/tank/context";
import { cn } from "@/lib/utils";

const ALWAYS_LINKS = [
  { href: "/tank/", label: "Home" },
  { href: "/tank/chemicals/", label: "Chemicals" },
  { href: "/tank/blend/", label: "Blend" },
] as const;

const TANK_LINKS = [
  { href: "/tank/fill/", label: "Fill" },
  { href: "/tank/log/", label: "Log" },
  { href: "/tank/composition/", label: "Composition" },
  { href: "/tank/planner/", label: "Planner" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/tank/") return pathname === "/tank" || pathname === "/tank/";
  return pathname === href || pathname === href.replace(/\/$/, "");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tankReady, loading } = useTank();
  const configured = isSupabaseConfigured();

  const links = [
    ...ALWAYS_LINKS,
    ...(loading ? [] : tankReady ? TANK_LINKS : [{ href: "/tank/setup/", label: "Set up tank" }]),
  ];

  async function signOut() {
    const supabase = getSupabaseBrowser();
    await supabase?.auth.signOut();
  }

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#tank-main"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-transform focus-visible:translate-y-0"
      >
        Skip to calculator
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container-tank flex items-center justify-between gap-2 py-3">
          <Link href="/tank/" className="font-heading text-lg font-semibold">
            Tank calculator
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="min-h-11 min-w-11">
              <Link href="/tank/guide/" aria-label="Open the in-app guide">
                <CircleHelp className="size-5" />
              </Link>
            </Button>
            <ThemeToggle />
            {configured ? (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Sign out"
                onClick={() => void signOut()}
              >
                <LogOut className="size-5" />
              </Button>
            ) : null}
          </div>
        </div>
        <nav aria-label="Calculator" className="container-tank overflow-x-auto pb-3">
          <ul className="flex gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium",
                    isActive(pathname, link.href)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="tank-main" className="container-tank flex-1">
        {configured ? null : (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            Data is stored on this device until Supabase keys are added.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

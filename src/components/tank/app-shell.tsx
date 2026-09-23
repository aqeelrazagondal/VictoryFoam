"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CircleHelp, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";
import { useTank } from "@/lib/tank/context";
import { cn } from "@/lib/utils";

const HOME_LINK = { href: "/tank/", label: "Home" } as const;

const MORE_LINKS = [
  { href: "/tank/chemicals/", label: "Chemicals" },
  { href: "/tank/inventory/", label: "Inventory" },
  { href: "/tank/blend/", label: "Blend" },
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
  const moreLinks = [
    ...MORE_LINKS,
    ...(loading || tankReady ? [] : [{ href: "/tank/setup/", label: "Set up tank" }]),
  ];
  const moreActive = moreLinks.some((link) => isActive(pathname, link.href));
  const [moreOpen, setMoreOpen] = useState(false);
  const showMore = moreOpen || moreActive;

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
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-1.5 md:max-w-2xl md:px-6">
          <Link href="/tank/" className="font-heading text-base font-semibold">
            Tank calculator
          </Link>
          <div className="flex items-center">
            <Button asChild variant="ghost" size="icon" className="size-9 min-h-9 min-w-9">
              <Link href="/tank/guide/" aria-label="Open the in-app guide">
                <CircleHelp className="size-4" />
              </Link>
            </Button>
            <ThemeToggle className="size-9 min-h-9 min-w-9" />
            {configured ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 min-h-9 min-w-9"
                aria-label="Sign out"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <nav
          aria-label="Calculator"
          data-tank-state={loading ? "loading" : tankReady ? "ready" : "empty"}
          className="mx-auto w-full max-w-xl overflow-x-auto px-4 pb-2 md:max-w-2xl md:px-6"
        >
          <ul id="calculator-more" className="flex flex-wrap gap-1.5">
            <li>
              <Link
                href={HOME_LINK.href}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium",
                  isActive(pathname, HOME_LINK.href)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
                aria-current={isActive(pathname, HOME_LINK.href) ? "page" : undefined}
              >
                {HOME_LINK.label}
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium",
                  showMore ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
                aria-expanded={showMore}
                aria-controls="calculator-more"
                onClick={() => setMoreOpen((open) => !open)}
              >
                More
              </button>
            </li>
            {showMore
              ? moreLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium",
                        isActive(pathname, link.href)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                      aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))
              : null}
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

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

const HOME_LINK = { href: "/tank/", label: "Home", hint: "What is already in the tank" } as const;
const SHELF_LINK = { href: "/tank/inventory/", label: "Shelf stock", hint: "Drums you have not poured" } as const;

const MORE_LINKS = [
  { href: "/tank/chemicals/", label: "Chemicals", hint: "Names and solid content" },
  { href: "/tank/blend/", label: "Blend", hint: "A fresh mix, not the tank" },
  { href: "/tank/fill/", label: "Fill", hint: "Older way to top the tank up" },
  { href: "/tank/log/", label: "Log", hint: "History of what went in and out" },
  { href: "/tank/composition/", label: "Composition", hint: "How many kg of each chemical" },
  { href: "/tank/planner/", label: "Planner", hint: "Try one chemical. Nothing is saved" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/tank/") return pathname === "/tank" || pathname === "/tank/";
  return pathname === href || pathname === href.replace(/\/$/, "");
}

function NavChip({
  href,
  label,
  hint,
  current,
}: {
  href: string;
  label: string;
  hint: string;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-8 flex-col justify-center rounded-2xl px-3 py-1.5 text-sm",
        current ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
      )}
      aria-current={current ? "page" : undefined}
    >
      <span className="font-medium leading-tight">{label}</span>
      <span
        className={cn(
          "text-xs leading-tight",
          current ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {hint}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tankReady, loading } = useTank();
  const configured = isSupabaseConfigured();
  const moreLinks = [
    ...MORE_LINKS,
    ...(loading || tankReady
      ? []
      : [{ href: "/tank/setup/", label: "Set up tank", hint: "First time only" }]),
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
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-1.5 md:max-w-3xl md:px-6 lg:max-w-[48rem]">
          <Link href="/tank/" className="font-heading text-base font-semibold">
            Tank calculator
          </Link>
          <div className="flex items-center">
            <Button asChild variant="ghost" className="h-9 min-h-9 gap-1.5 px-2">
              <Link href="/tank/guide/">
                <CircleHelp className="size-4" />
                Help
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
          className="mx-auto w-full max-w-xl overflow-x-auto px-4 pb-2 md:max-w-3xl md:px-6 lg:max-w-[48rem]"
        >
          <ul id="calculator-more" className="flex flex-wrap items-stretch gap-1.5">
            <li>
              <NavChip
                href={HOME_LINK.href}
                label={HOME_LINK.label}
                hint={HOME_LINK.hint}
                current={isActive(pathname, HOME_LINK.href)}
              />
            </li>
            <li>
              <NavChip
                href={SHELF_LINK.href}
                label={SHELF_LINK.label}
                hint={SHELF_LINK.hint}
                current={isActive(pathname, SHELF_LINK.href)}
              />
            </li>
            <li>
              <button
                type="button"
                className={cn(
                  "inline-flex h-full min-h-8 items-center rounded-2xl px-3 text-sm font-medium",
                  showMore ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
                aria-expanded={showMore}
                aria-controls="calculator-more"
                onClick={() => setMoreOpen((open) => !open)}
              >
                More screens
              </button>
            </li>
            {showMore
              ? moreLinks.map((link) => (
                  <li key={link.href}>
                    <NavChip
                      href={link.href}
                      label={link.label}
                      hint={link.hint}
                      current={isActive(pathname, link.href)}
                    />
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CircleHelp, Droplets, Ellipsis, History, LogOut, Warehouse } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TankNameLabel, TankSwitcher } from "@/components/tank/tank-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/tank/client";
import { useTank } from "@/lib/tank/context";
import { cn } from "@/lib/utils";

const WorkflowContext = createContext<(open: boolean) => void>(() => {});

export function useWorkflowChrome() {
  return useContext(WorkflowContext);
}

const PRIMARY = [
  { href: "/tank/", label: "Tank", icon: Droplets },
  { href: "/tank/inventory/", label: "Inventory", icon: Warehouse },
  { href: "/tank/log/", label: "Activity", icon: History },
] as const;

const MORE_GROUPS = [
  {
    label: "Calculate",
    links: [
      { href: "/tank/blend/", label: "Blend" },
      { href: "/tank/fill/", label: "Fill" },
      { href: "/tank/planner/", label: "Planner" },
    ],
  },
  {
    label: "Manage",
    links: [
      { href: "/tank/chemicals/", label: "Chemicals" },
      { href: "/tank/composition/", label: "Composition" },
    ],
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/tank/") return pathname === "/tank" || pathname === "/tank/";
  return pathname === href || pathname === href.replace(/\/$/, "");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tankReady, loading, error, retry } = useTank();
  const configured = isSupabaseConfigured();
  const [moreOpen, setMoreOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const setupLink = {
    href: "/tank/setup/",
    label: tankReady ? "Tank settings" : "Set up tank",
  };
  const moreHrefs = [
    ...MORE_GROUPS.flatMap((group) => group.links.map((link) => link.href)),
    "/tank/guide/",
    setupLink.href,
  ];
  const moreCurrent = moreHrefs.some((href) => isActive(pathname, href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function signOut() {
    const supabase = getSupabaseBrowser();
    try {
      await supabase?.auth.signOut();
    } catch {
      setMoreOpen(false);
      return;
    }
    setMoreOpen(false);
  }

  return (
    <WorkflowContext.Provider value={setWorkflowOpen}>
      <div className="tank-app flex min-h-dvh flex-col">
        <a
          href="#tank-main"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-transform focus-visible:translate-y-0"
        >
          Skip to calculator
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-2 md:max-w-3xl md:px-6 lg:max-w-[48rem]">
            <div className="min-w-0">
              <Link href="/tank/" className="font-heading text-base font-semibold">
                Tank calculator
              </Link>
              {isActive(pathname, "/tank/") && !workflowOpen ? <TankNameLabel /> : <TankSwitcher />}
            </div>
            <Button asChild variant="ghost" className="h-11 min-h-11 gap-1.5 px-3">
              <Link href="/tank/guide/">
                <CircleHelp className="size-4" />
                Help
              </Link>
            </Button>
          </div>
        </header>
        <main id="tank-main" className="container-tank flex-1">
          {configured ? null : (
            <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              Data is stored on this device until Supabase keys are added.
            </p>
          )}
          {error ? (
            <div
              className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
              role="alert"
            >
              <p className="text-sm">{error}</p>
              <Button
                className="mt-3"
                size="touch"
                type="button"
                variant="outline"
                onClick={() => void retry()}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {children}
        </main>
        {workflowOpen ? null : (
          <nav
            aria-label="Calculator"
            data-tank-state={loading ? "loading" : tankReady ? "ready" : "empty"}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]"
          >
            <ul className="mx-auto grid w-full max-w-xl grid-cols-4 md:max-w-3xl lg:max-w-[48rem]">
              {PRIMARY.map((item) => {
                const current = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium",
                        current ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  className={cn(
                    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium",
                    moreCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-expanded={moreOpen}
                  aria-controls="tank-more"
                  aria-current={moreCurrent ? "page" : undefined}
                  onClick={() => setMoreOpen(true)}
                >
                  <Ellipsis className="size-5" aria-hidden="true" />
                  More
                </button>
              </li>
            </ul>
          </nav>
        )}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" id="tank-more" aria-describedby={undefined}>
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-5 pb-[env(safe-area-inset-bottom,0px)]">
              {MORE_GROUPS.map((group) => (
                <section key={group.label}>
                  <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
                  <ul className="mt-2 space-y-1">
                    {group.links.map((link) => {
                      const current = isActive(pathname, link.href);
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            aria-current={current ? "page" : undefined}
                            className={cn(
                              "flex min-h-11 items-center rounded-xl px-3 text-base font-medium",
                              current ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                            )}
                            onClick={() => setMoreOpen(false)}
                          >
                            {link.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <section>
                <h2 className="text-sm font-medium text-muted-foreground">Help and preferences</h2>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={setupLink.href}
                      className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium hover:bg-muted"
                      onClick={() => setMoreOpen(false)}
                    >
                      {setupLink.label}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/tank/guide/"
                      aria-current={isActive(pathname, "/tank/guide/") ? "page" : undefined}
                      className="flex min-h-11 items-center rounded-xl px-3 text-base font-medium hover:bg-muted"
                      onClick={() => setMoreOpen(false)}
                    >
                      Guide
                    </Link>
                  </li>
                  <li className="flex min-h-11 items-center justify-between px-3">
                    <span className="text-base font-medium">Theme</span>
                    <ThemeToggle />
                  </li>
                  {configured ? (
                    <li>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-base font-medium hover:bg-muted"
                        onClick={() => void signOut()}
                      >
                        <LogOut className="size-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </li>
                  ) : null}
                </ul>
              </section>
              <Button type="button" variant="outline" size="touch" className="w-full" onClick={() => setMoreOpen(false)}>
                Close
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </WorkflowContext.Provider>
  );
}

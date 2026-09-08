"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Layers3, Menu, Phone } from "lucide-react";

import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { company, navigation } from "@/data/company";
import { computeCinemaHeaderState } from "@/lib/header-cinema-state";
import { cn, toTelHref } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [overCinema, setOverCinema] = useState(pathname === "/");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");

    const update = () => {
      setScrolled(window.scrollY > 20);
      const cinema = document.getElementById("mattress-cinema");
      const rect = cinema?.getBoundingClientRect();
      const state = computeCinemaHeaderState({
        isHome: pathname === "/",
        isDesktop: media.matches,
        cinemaRect: rect ? { top: rect.top, bottom: rect.bottom } : null,
      });
      setOverCinema(state.overCinema);
    };

    update();

    let observer: MutationObserver | undefined;
    if (pathname === "/" && !document.getElementById("mattress-cinema")) {
      observer = new MutationObserver(() => {
        if (document.getElementById("mattress-cinema")) {
          observer?.disconnect();
          update();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    media.addEventListener("change", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      media.removeEventListener("change", update);
    };
  }, [pathname]);

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <header
        className={cn(
          "relative sticky top-0 isolate z-50 w-full motion-safe:transition-colors motion-safe:duration-300",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/30 after:to-transparent after:opacity-0 after:transition-opacity after:duration-300 after:content-['']",
          overCinema
            ? "dark border-b border-white/10 bg-[#0B1121] text-white after:opacity-100"
            : scrolled
              ? "border-b border-border/50 bg-background/80 text-foreground shadow-lg shadow-black/10 backdrop-blur-xl after:opacity-100"
              : "bg-transparent text-foreground",
        )}
      >
        <div className="container-site flex h-18 items-center justify-between">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 font-heading text-lg font-bold tracking-tight",
              overCinema ? "text-white" : "text-foreground",
            )}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--color-secondary-accent))] text-white shadow-sm">
              <Layers3 className="size-5" />
            </span>
            {company.name}
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.replace(/\/$/, ""));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium transition-colors duration-200",
                    overCinema
                      ? "text-slate-300 hover:text-white"
                      : "text-muted-foreground hover:text-foreground",
                    "after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-gradient-to-r after:from-[hsl(var(--primary))] after:to-[hsl(var(--color-secondary-accent))] after:transition-all after:duration-300 after:content-[''] hover:after:w-full",
                    active && (overCinema ? "text-white after:w-full" : "text-foreground after:w-full"),
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <TrackedAnchor
              href={toTelHref(company.phone)}
              linkType="phone"
              className={cn(
                "mr-1 hidden min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:inline-flex",
                overCinema
                  ? "text-slate-200 hover:text-white"
                  : "text-foreground hover:text-primary",
                "underline-offset-2 hover:underline",
              )}
            >
              <Phone className="size-4 text-primary" />
              {company.phone}
            </TrackedAnchor>
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent className="!w-full !max-w-full p-6" side="right">
                <SheetHeader>
                  <SheetTitle className="font-heading text-xl">{company.name}</SheetTitle>
                </SheetHeader>
                <nav className="mt-12 grid gap-2" aria-label="Mobile navigation">
                  {navigation.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="rounded-xl border-b border-border px-2 py-4 font-heading text-2xl font-semibold"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

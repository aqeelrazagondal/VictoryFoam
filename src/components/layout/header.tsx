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
import { cn, toTelHref } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(pathname !== "/");
  const [overCinema, setOverCinema] = useState(pathname === "/");

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (pathname === "/") {
        const cinema = document.getElementById("mattress-cinema");
        if (cinema && window.matchMedia("(min-width: 768px)").matches) {
          const rect = cinema.getBoundingClientRect();
          const pastCinema = rect.bottom < 120;
          const stillInCinema = rect.top < 80 && rect.bottom > 120;
          setOverCinema(stillInCinema && !pastCinema);
          setHeaderVisible(y > 40 || pastCinema || y > window.innerHeight * 0.15);
        } else {
          setOverCinema(false);
          setHeaderVisible(true);
        }
      } else {
        setOverCinema(false);
        setHeaderVisible(true);
      }
    };

    update();
    const timer =
      pathname === "/"
        ? window.setTimeout(() => setHeaderVisible(true), 2000)
        : undefined;
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (timer) window.clearTimeout(timer);
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
          "relative sticky top-0 z-50 transition-all duration-300",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/30 after:to-transparent after:opacity-0 after:transition-opacity after:duration-300 after:content-['']",
          headerVisible ? "opacity-100" : "pointer-events-none opacity-0",
          overCinema
            ? "border-b border-white/10 bg-[#0B1121]/70 text-white backdrop-blur-xl after:opacity-100"
            : scrolled
              ? "border-b border-border/50 bg-background/80 shadow-lg shadow-black/10 backdrop-blur-xl after:opacity-100"
              : "bg-transparent",
        )}
      >
        <div className="container-site flex h-18 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
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

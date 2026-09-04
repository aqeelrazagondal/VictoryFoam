"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StickyCtaBar({ triggerId = "mattress-cinema" }: { triggerId?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const cinema = document.getElementById(triggerId);
      const mobileHero = document.getElementById("mobile-mattress-hero");

      if (window.matchMedia("(min-width: 768px)").matches) {
        if (!cinema) {
          setVisible(false);
          return;
        }
        const rect = cinema.getBoundingClientRect();
        setVisible(rect.bottom <= 0);
        return;
      }

      if (mobileHero) {
        const rect = mobileHero.getBoundingClientRect();
        setVisible(rect.bottom <= 0);
        return;
      }

      setVisible(false);
    };

    update();
    const poll = window.setInterval(update, 500);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [triggerId]);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl transition-transform duration-300",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="container-site flex items-center justify-between gap-4 py-3">
        <p className="hidden text-sm text-muted-foreground sm:block">
          Have a project in mind?
        </p>
        <Button asChild size="sm" variant="gradient" className="ml-auto shadow-md shadow-primary/25">
          <Link href="/contact/">
            Get in Touch <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

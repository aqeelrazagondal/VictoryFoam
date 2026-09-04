"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StickyCtaBar({ triggerId = "mattress-cinema" }: { triggerId?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cinema = document.getElementById(triggerId);
    const mobileHero = document.getElementById("mobile-mattress-hero");

    const update = () => {
      if (window.matchMedia("(min-width: 768px)").matches && cinema) {
        const rect = cinema.getBoundingClientRect();
        // Only after the cinema section has fully left the viewport.
        setVisible(rect.bottom <= 0);
        return;
      }
      if (mobileHero) {
        const rect = mobileHero.getBoundingClientRect();
        setVisible(rect.bottom <= 0);
        return;
      }
      setVisible(window.scrollY > window.innerHeight * 0.75);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [triggerId]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
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

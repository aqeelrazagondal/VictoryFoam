"use client";

import { Phone } from "lucide-react";
import { useEffect, useState } from "react";

import { useConsent } from "@/components/analytics/consent-provider";
import { TrackedAnchor, TrackedLink } from "@/components/analytics/tracked-link";
import { Button } from "@/components/ui/button";
import { company } from "@/data/company";
import { cn, toTelHref } from "@/lib/utils";

export function StickyCtaBar({ triggerId = "mattress-cinema" }: { triggerId?: string }) {
  const { bannerVisible } = useConsent();
  const [pastHero, setPastHero] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    let observer: IntersectionObserver | null = null;

    function hero() {
      return desktop.matches
        ? document.getElementById(triggerId)
        : document.getElementById("mobile-mattress-hero");
    }

    function connect() {
      observer?.disconnect();
      const element = hero();
      if (!element) {
        setPastHero(false);
        return false;
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
        },
        { threshold: 0 },
      );
      observer.observe(element);
      return true;
    }

    connect();
    const retry = window.setInterval(() => {
      if (connect()) window.clearInterval(retry);
    }, 250);
    const stopRetry = window.setTimeout(() => window.clearInterval(retry), 4000);
    desktop.addEventListener("change", connect);
    return () => {
      observer?.disconnect();
      desktop.removeEventListener("change", connect);
      window.clearInterval(retry);
      window.clearTimeout(stopRetry);
    };
  }, [triggerId]);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.08 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const visible = pastHero && !footerVisible && !bannerVisible;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-xl transition-transform duration-300",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <div className="container-site flex items-center justify-between gap-4 py-3">
        <p className="hidden text-sm text-muted-foreground md:block">Have a project in mind?</p>
        <div className="ml-auto flex items-center gap-3">
          <TrackedAnchor
            href={toTelHref(company.phone)}
            linkType="phone"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            <Phone className="size-4" />
            {company.phone}
          </TrackedAnchor>
          <Button asChild size="sm" variant="gradient" className="min-h-11 shadow-md shadow-primary/25">
            <TrackedLink href="/contact/" event="cta_click" eventParams={{ cta_id: "sticky-request-a-quote" }}>
              Request a Quote
            </TrackedLink>
          </Button>
        </div>
      </div>
    </div>
  );
}

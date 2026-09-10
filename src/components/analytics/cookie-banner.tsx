"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { useConsent } from "@/components/analytics/consent-provider";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const { bannerVisible, accept, decline } = useConsent();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerVisible) {
      dialogRef.current?.focus();
    }
  }, [bannerVisible]);

  if (!bannerVisible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-copy"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-background/95 px-4 py-4 shadow-2xl backdrop-blur-xl outline-none"
    >
      <div className="container-site flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p id="cookie-banner-title" className="font-heading text-sm font-semibold text-foreground">
            Cookies
          </p>
          <p id="cookie-banner-copy" className="mt-1 text-sm text-muted-foreground">
            We use cookies to understand how you use our site. See our{" "}
            <Link href="/privacy/" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            for details. Essential site features work without analytics cookies.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={decline} className="min-h-11">
            Decline
          </Button>
          <Button type="button" onClick={accept} className="min-h-11">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

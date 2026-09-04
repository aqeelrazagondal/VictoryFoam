"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ConsentProvider } from "@/components/analytics/consent-provider";
import { CookieBanner } from "@/components/analytics/cookie-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { QuickEnquiryFab } from "@/components/conversion/quick-enquiry-fab";

function SiteFab({ formId }: { formId?: string }) {
  const pathname = usePathname();
  if (pathname === "/contact" || pathname === "/contact/") return null;
  return <QuickEnquiryFab formId={formId} />;
}

export function SiteChrome({
  children,
  measurementId,
  formId,
}: {
  children: ReactNode;
  measurementId?: string;
  formId?: string;
}) {
  return (
    <ConsentProvider measurementId={measurementId}>
      {children}
      <CookieBanner />
      <GoogleAnalytics />
      <SiteFab formId={formId} />
    </ConsentProvider>
  );
}

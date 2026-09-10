"use client";

import { useConsent } from "@/components/analytics/consent-provider";

export function CookiePreferences() {
  const { measurementId, reset } = useConsent();
  if (!measurementId) return null;

  return (
    <button
      type="button"
      onClick={reset}
      className="hover:text-sky-400"
    >
      Cookie settings
    </button>
  );
}

export const CONSENT_KEY = "victoryfoam-cookie-consent";

export type ConsentStatus = "accepted" | "declined" | null;

const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

export function getGaMeasurementId() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id && GA_ID_PATTERN.test(id) ? id : undefined;
}

export function getConsent(): ConsentStatus {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_KEY);
  if (value === "accepted" || value === "declined") return value;
  return null;
}

export function setConsent(status: Exclude<ConsentStatus, null>) {
  window.localStorage.setItem(CONSENT_KEY, status);
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params);
}

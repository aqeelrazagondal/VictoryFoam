"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  getConsent,
  resolveGaMeasurementId,
  setConsent as persistConsent,
  clearConsent,
  type ConsentStatus,
} from "@/lib/analytics";

const CONSENT_EVENT = "victoryfoam-consent-change";

type ConsentContextValue = {
  measurementId: string | undefined;
  consent: ConsentStatus;
  bannerVisible: boolean;
  accept: () => void;
  decline: () => void;
  reset: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

function subscribeConsent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_EVENT, onChange);
  };
}

function notifyConsent() {
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function ConsentProvider({
  children,
  measurementId,
}: {
  children: ReactNode;
  measurementId?: string;
}) {
  const resolvedId = resolveGaMeasurementId(measurementId);
  const consent = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  const accept = useCallback(() => {
    persistConsent("accepted");
    notifyConsent();
  }, []);

  const decline = useCallback(() => {
    persistConsent("declined");
    notifyConsent();
  }, []);

  const reset = useCallback(() => {
    clearConsent();
    notifyConsent();
  }, []);

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const bannerVisible = Boolean(resolvedId) && isClient && consent === null;

  const value = useMemo(
    () => ({
      measurementId: resolvedId,
      consent,
      bannerVisible,
      accept,
      decline,
      reset,
    }),
    [resolvedId, consent, bannerVisible, accept, decline, reset],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return context;
}

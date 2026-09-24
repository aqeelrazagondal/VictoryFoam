"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

export function TurnstileField({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const siteKey = turnstileSiteKey();

  useEffect(() => {
    if (!siteKey || !host.current) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !host.current || !window.turnstile || !siteKey) return;
      widget.current = window.turnstile.render(host.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (existing) {
        existing.addEventListener("load", renderWidget);
      } else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.turnstile = "true";
        script.addEventListener("load", renderWidget);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div ref={host} className="flex justify-center" />;
}

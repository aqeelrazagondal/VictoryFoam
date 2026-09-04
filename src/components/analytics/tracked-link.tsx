"use client";

import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ComponentProps } from "react";

import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event?: "cta_click" | "click";
  eventParams?: Record<string, string>;
};

export const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(
  function TrackedLink({ event, eventParams, onClick, ...props }, ref) {
    return (
      <Link
        {...props}
        ref={ref}
        onClick={(clickEvent) => {
          if (event) trackEvent(event, eventParams);
          onClick?.(clickEvent);
        }}
      />
    );
  },
);

type TrackedAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  linkType?: "phone" | "email";
  ctaId?: string;
};

export const TrackedAnchor = forwardRef<HTMLAnchorElement, TrackedAnchorProps>(
  function TrackedAnchor({ linkType, ctaId, className, onClick, ...props }, ref) {
    return (
      <a
        {...props}
        ref={ref}
        className={cn(className)}
        onClick={(clickEvent) => {
          if (ctaId) trackEvent("cta_click", { cta_id: ctaId });
          if (linkType) trackEvent("click", { link_type: linkType });
          onClick?.(clickEvent);
        }}
      />
    );
  },
);

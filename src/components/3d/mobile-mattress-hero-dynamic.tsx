"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { ClientErrorBoundary } from "@/components/error-boundary";

const MobileMattressHero = dynamic(() => import("./mobile-mattress-hero"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0B1121] text-slate-300">
      Loading...
    </div>
  ),
});

function MobileHeroFallback() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0B1121] px-6 text-center text-slate-300">
      <p>The interactive mattress view could not load. Scroll to see our products.</p>
    </div>
  );
}

export function MobileMattressHeroDynamic() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <div id="mobile-mattress-hero">
      {enabled ? (
        <ClientErrorBoundary fallback={<MobileHeroFallback />}>
          <MobileMattressHero />
        </ClientErrorBoundary>
      ) : (
        <div className="min-h-[70vh] bg-[#0B1121]" aria-hidden="true" />
      )}
    </div>
  );
}

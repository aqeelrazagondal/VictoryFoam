"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MobileMattressHero = dynamic(() => import("./mobile-mattress-hero"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0B1121] text-slate-300">
      Loading...
    </div>
  ),
});

export function MobileMattressHeroDynamic() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (!enabled) return null;
  return (
    <div id="mobile-mattress-hero">
      <MobileMattressHero />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Component, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { shouldUseHeavyWebGl } from "@/lib/webgl";

const MattressScrollExperience = dynamic(() => import("./mattress-scroll-experience"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B1121] text-slate-300">
      Loading experience...
    </div>
  ),
});

function CinemaFallback({
  action,
}: {
  action?: ReactNode;
}) {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#0B1121] dark">
      <Image
        src="/images/products/foam-layer-fallback.svg"
        alt="Exploded five-layer mattress foam construction"
        width={1600}
        height={1200}
        className="absolute inset-0 h-full w-full object-cover opacity-50"
        priority
      />
      <div className="container-site relative z-10 py-28 text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          Engineered from the inside out.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 md:text-lg">
          Five-layer foam constructions developed for repeatable comfort, support, and
          South African manufacturing timelines.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" variant="gradient">
            <Link href="/contact/">Start Your Project</Link>
          </Button>
          {action}
        </div>
      </div>
    </section>
  );
}

class CinemaErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.failed) return <CinemaFallback />;
    return this.props.children;
  }
}

export function MattressScrollDynamic() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"loading" | "interactive" | "fallback">("loading");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);

    const timer = window.setTimeout(() => {
      setMode(shouldUseHeavyWebGl() ? "interactive" : "fallback");
    }, 0);

    return () => {
      media.removeEventListener("change", sync);
      window.clearTimeout(timer);
    };
  }, []);

  if (!enabled) return null;

  if (mode !== "interactive") {
    return (
      <CinemaFallback
        action={
          mode === "fallback" ? (
            <Button type="button" variant="outline" onClick={() => setMode("interactive")}>
              Load interactive view
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <CinemaErrorBoundary onError={() => setMode("fallback")}>
      <MattressScrollExperience />
    </CinemaErrorBoundary>
  );
}

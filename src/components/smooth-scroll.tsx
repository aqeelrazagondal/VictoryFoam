"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type SmoothScrollContextValue = {
  lenis: Lenis | null;
  scrollTo: (top: number, immediate?: boolean) => void;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
  scrollTo: (top, immediate) => {
    window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
  },
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

type SmoothScrollProps = {
  children: ReactNode;
  /** When false, native scroll is used (recommended with sticky ScrollTrigger cinema). */
  enabled?: boolean;
};

/**
 * Optional Lenis wrapper. Disabled by default on the homepage cinema because
 * Lenis + sticky + scrubbed ScrollTrigger fights native scroll range and feels stuck.
 */
export function SmoothScroll({ children, enabled = false }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 0.9,
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const onResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(ticker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  const value = useMemo<SmoothScrollContextValue>(
    () => ({
      get lenis() {
        return lenisRef.current;
      },
      scrollTo: (top, immediate = false) => {
        const lenis = lenisRef.current;
        if (lenis) {
          lenis.scrollTo(top, { immediate });
          return;
        }
        window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
      },
    }),
    [],
  );

  return (
    <SmoothScrollContext.Provider value={value}>{children}</SmoothScrollContext.Provider>
  );
}

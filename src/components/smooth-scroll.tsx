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
  enabled?: boolean;
};

export function SmoothScroll({ children, enabled = true }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    return () => {
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

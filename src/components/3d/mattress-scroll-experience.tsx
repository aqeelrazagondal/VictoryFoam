"use client";

import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { MattressScrollScene } from "@/components/3d/mattress-scroll-scene";
import { ScrollOverlay } from "@/components/3d/scroll-overlay";
import { ScrollProgress } from "@/components/3d/scroll-progress";
import { useSmoothScroll } from "@/components/smooth-scroll";
import { mattressLayers, type MattressLayerId } from "@/data/mattress-scroll";
import {
  CinemaProvider,
  defaultCinemaState,
  useCinema,
} from "@/lib/cinema-state";

gsap.registerPlugin(ScrollTrigger);

function fullOpacity(): Record<MattressLayerId, number> {
  return Object.fromEntries(mattressLayers.map((layer) => [layer.id, 1])) as Record<
    MattressLayerId,
    number
  >;
}

function CinemaInner({ reduceMotion }: { reduceMotion: boolean }) {
  const { stateRef, setProgress } = useCinema();
  const { scrollTo } = useSmoothScroll();
  const [progress, setProgressUi] = useState(0);
  const [inView, setInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    if (reduceMotion) {
      stateRef.current = {
        ...defaultCinemaState,
        explode: 0,
        opacities: fullOpacity(),
        highlight: null,
        camera: { x: 6.2, y: 3.4, z: 7.2, lookX: 0, lookY: 0, lookZ: 0 },
        blur: 0,
        progress: 0,
      };
      setProgressUi(0);
      return;
    }

    const proxy = {
      progress: 0,
      explode: 0,
      camX: 6.2,
      camY: 3.4,
      camZ: 7.2,
      lookY: 0,
      blur: 0,
      support: 1,
      transition: 1,
      memory: 1,
      comfort: 1,
      cover: 1,
      highlightIndex: -1,
    };

    const layerIds: MattressLayerId[] = [
      "support",
      "transition",
      "memory",
      "comfort",
      "cover",
    ];

    const applyProxy = () => {
      const highlight =
        proxy.highlightIndex >= 0 && proxy.highlightIndex < layerIds.length
          ? layerIds[proxy.highlightIndex]
          : null;
      stateRef.current.progress = proxy.progress;
      stateRef.current.explode = proxy.explode;
      stateRef.current.blur = proxy.blur;
      stateRef.current.highlight = highlight;
      stateRef.current.camera = {
        x: proxy.camX,
        y: proxy.camY,
        z: proxy.camZ,
        lookX: 0,
        lookY: proxy.lookY,
        lookZ: 0,
      };
      stateRef.current.opacities = {
        support: proxy.support,
        transition: proxy.transition,
        memory: proxy.memory,
        comfort: proxy.comfort,
        cover: proxy.cover,
      };
      setProgress(proxy.progress);
      setProgressUi(proxy.progress);
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: "top top",
        // Match CSS sticky lifetime: animation completes as the spacer bottom
        // reaches the viewport bottom, then native scroll reveals content below.
        end: "bottom bottom",
        scrub: 0.35,
        invalidateOnRefresh: true,
        onUpdate: applyProxy,
        onRefresh: (self) => {
          tl.progress(self.progress);
          applyProxy();
        },
      },
    });

    tl.to(proxy, { progress: 0.15, explode: 1, camX: 4.5, camY: 2.2, camZ: 6.5, duration: 1.5 }, 0);
    tl.to(
      proxy,
      {
        progress: 0.3,
        camX: 3.2,
        camY: -0.2,
        camZ: 5.2,
        lookY: -1.0,
        support: 1,
        transition: 0.15,
        memory: 0.15,
        comfort: 0.15,
        cover: 0.15,
        highlightIndex: 0,
        duration: 1,
      },
      1.5,
    );
    tl.to(
      proxy,
      {
        progress: 0.45,
        camY: 0.2,
        lookY: -0.4,
        support: 0.15,
        transition: 1,
        highlightIndex: 1,
        duration: 1,
      },
      2.5,
    );
    tl.to(
      proxy,
      {
        progress: 0.6,
        camY: 0.8,
        lookY: 0.15,
        transition: 0.15,
        memory: 1,
        highlightIndex: 2,
        duration: 1,
      },
      3.5,
    );
    tl.to(
      proxy,
      {
        progress: 0.75,
        camY: 1.5,
        lookY: 0.85,
        memory: 0.15,
        comfort: 1,
        cover: 1,
        highlightIndex: 4,
        duration: 1,
      },
      4.5,
    );
    tl.to(
      proxy,
      {
        progress: 0.85,
        explode: 0,
        camX: 6.0,
        camY: 3.2,
        camZ: 7.0,
        lookY: 0,
        support: 1,
        transition: 1,
        memory: 1,
        comfort: 1,
        cover: 1,
        highlightIndex: -1,
        duration: 1,
      },
      5.5,
    );
    tl.to(
      proxy,
      {
        progress: 1,
        camX: 7.2,
        camY: 4.0,
        camZ: 8.5,
        blur: 1,
        duration: 1,
      },
      6.5,
    );

    const syncFromScroll = () => {
      const st = tl.scrollTrigger;
      if (st) {
        tl.progress(st.progress);
        applyProxy();
      }
      ScrollTrigger.update();
    };

    ScrollTrigger.refresh();
    requestAnimationFrame(syncFromScroll);
    const refreshTimer = window.setTimeout(() => {
      ScrollTrigger.refresh();
      syncFromScroll();
    }, 250);

    const onResize = () => {
      ScrollTrigger.refresh();
      syncFromScroll();
    };
    window.addEventListener("resize", onResize);

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(element);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("resize", onResize);
      tl.scrollTrigger?.kill();
      tl.kill();
      observer.disconnect();
    };
  }, [reduceMotion, setProgress, stateRef]);

  return (
    <div ref={containerRef} className="relative h-[450vh] md:h-[500vh]" id="mattress-cinema">
      <div className="sticky top-0 h-dvh min-h-[100svh] overflow-hidden bg-[#0B1121] dark">
        <div
          className="pointer-events-none absolute inset-0 transition-[filter,opacity] duration-500"
          style={{
            filter: progress > 0.85 ? `blur(${(progress - 0.85) * 20}px)` : undefined,
            opacity: progress > 0.9 ? 0.55 : 1,
          }}
        >
          <Canvas
            camera={{ position: [6.2, 3.4, 7.2], fov: 42 }}
            dpr={[1, 1.75]}
            frameloop={inView ? "always" : "demand"}
            gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
            style={{ pointerEvents: "none" }}
            onCreated={({ gl }) => {
              gl.setClearColor("#0B1121", 1);
            }}
          >
            <MattressScrollScene reduceMotion={reduceMotion} active={inView} />
          </Canvas>
        </div>

        {progress > 0.85 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-background/60 backdrop-blur-sm"
            style={{ opacity: Math.min(1, (progress - 0.85) / 0.1) }}
          />
        )}

        <ScrollOverlay progress={progress} reduceMotion={reduceMotion} />
        <ScrollProgress
          progress={progress}
          onJump={(target) => {
            const el = containerRef.current;
            if (!el) return;
            const range = Math.max(1, el.offsetHeight - window.innerHeight);
            const top = el.offsetTop + target * range;
            scrollTo(top, reduceMotion);
          }}
        />
      </div>
    </div>
  );
}

export default function MattressScrollExperience() {
  const [reduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <CinemaProvider>
      <CinemaInner reduceMotion={reduceMotion} />
    </CinemaProvider>
  );
}

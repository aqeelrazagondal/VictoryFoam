"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MattressLayerMesh } from "@/components/3d/mattress-layers";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mattressLayers } from "@/data/mattress-scroll";
import { shouldUseHeavyWebGl } from "@/lib/webgl";
import { cn } from "@/lib/utils";

function MobileScene({
  selected,
  hovered,
  reduceMotion,
}: {
  selected: number;
  hovered: number | null;
  reduceMotion: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight position={[4, 6, 4]} intensity={1.2} angle={0.5} penumbra={0.8} />
      <spotLight position={[-2, 3, -2]} intensity={0.35} color="#38BDF8" />
      {mattressLayers.map((layer, index) => (
        <MattressLayerMesh
          key={layer.id}
          layer={layer}
          y={layer.assembledY}
          opacity={hovered === null || hovered === index || selected === index ? 1 : 0.35}
          highlighted={selected === index || hovered === index}
          reduceMotion={reduceMotion}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.55}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export default function MobileMattressHero() {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [reduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [canRender, setCanRender] = useState(false);
  const active = mattressLayers[selected];

  useEffect(() => {
    setCanRender(shouldUseHeavyWebGl());
  }, []);

  return (
    <section id="mobile-mattress-hero-inner" className="relative overflow-hidden bg-[#0B1121] text-white md:hidden">
      <div className="container-site flex min-h-[88vh] flex-col justify-center py-10">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-white">
          Engineered from the inside out.
        </h1>
        <p className="mt-4 max-w-md text-base text-slate-300">
          Five precision foam layers, built around your specification.
        </p>

        <div className="relative mt-8 h-[320px] overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-primary/10">
          {canRender ? (
            <Canvas camera={{ position: [5.5, 3.2, 6.5], fov: 42 }} dpr={[1, 1.5]}>
              <MobileScene
                selected={selected}
                hovered={hovered}
                reduceMotion={reduceMotion}
              />
            </Canvas>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-400">
              Interactive preview unavailable on this device.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-200">
                Explore layers
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Mattress layers</SheetTitle>
              </SheetHeader>
              <div className="mt-6 grid gap-2">
                {mattressLayers.map((layer, index) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelected(index)}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      "rounded-xl border border-border px-4 py-3 text-left",
                      selected === index && "border-primary bg-primary/10",
                    )}
                  >
                    <p className="font-medium text-foreground">{layer.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{layer.detail}</p>
                  </button>
                ))}
              </div>
              <div className="glass-card mt-4 rounded-xl p-4">
                <p className="font-heading font-semibold text-foreground">{active.name}</p>
                <p className="mt-1 text-sm text-primary">{active.material}</p>
                <p className="mt-2 text-sm text-muted-foreground">{active.detail}</p>
              </div>
            </SheetContent>
          </Sheet>
          <Button asChild size="lg" variant="gradient" className="shadow-lg shadow-primary/25">
            <Link href="/contact/">
              Start Your Project <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

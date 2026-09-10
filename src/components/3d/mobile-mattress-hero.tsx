"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { ArrowRight, Layers3 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { MathUtils, type Mesh } from "three";

import { Button } from "@/components/ui/button";
import { mattressLayers } from "@/data/mattress-scroll";
import { shouldUseHeavyWebGl } from "@/lib/webgl";
import { cn } from "@/lib/utils";
import { TrackedLink } from "@/components/analytics/tracked-link";

function MobileLayer({
  index,
  selected,
  hovered,
  exploded,
  reduceMotion,
  onSelect,
  onHover,
}: {
  index: number;
  selected: number;
  hovered: number | null;
  exploded: boolean;
  reduceMotion: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  const layer = mattressLayers[index];
  const meshRef = useRef<Mesh>(null);
  const active = selected === index || hovered === index;

  useFrame(() => {
    if (!meshRef.current) return;
    const targetY = exploded ? layer.explodedY : layer.assembledY;
    meshRef.current.position.y = reduceMotion
      ? targetY
      : MathUtils.lerp(meshRef.current.position.y, targetY, 0.12);
    const targetScale = active ? 1.04 : 1;
    const scale = reduceMotion
      ? targetScale
      : MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.14);
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[5, layer.height, 3.2]}
      radius={Math.min(0.16, layer.height / 3)}
      smoothness={4}
      position={[0, layer.assembledY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(index);
      }}
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
    >
      <meshStandardMaterial
        color={layer.color}
        roughness={0.55}
        metalness={0.05}
        transparent={hovered !== null && !active}
        opacity={hovered !== null && !active ? 0.28 : 1}
        emissive={layer.color}
        emissiveIntensity={active ? 0.35 : 0.05}
      />
    </RoundedBox>
  );
}

function MobileScene({
  selected,
  hovered,
  exploded,
  reduceMotion,
  onSelect,
  onHover,
}: {
  selected: number;
  hovered: number | null;
  exploded: boolean;
  reduceMotion: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  return (
    <>
      <color attach="background" args={["#0B1121"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 4]} intensity={2.2} />
      <hemisphereLight args={["#dbeafe", "#64748b", 0.55]} />
      <spotLight position={[-3, 4, 2]} intensity={0.7} color="#38BDF8" />
      {mattressLayers.map((layer, index) => (
        <MobileLayer
          key={layer.id}
          index={index}
          selected={selected}
          hovered={hovered}
          exploded={exploded}
          reduceMotion={reduceMotion}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate={!reduceMotion && !exploded}
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

export default function MobileMattressHero() {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [exploring, setExploring] = useState(false);
  const [reduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [canRender] = useState(() => shouldUseHeavyWebGl());
  const active = mattressLayers[hovered ?? selected];

  const showFallback = !canRender;

  return (
    <section
      id="mobile-mattress-hero-inner"
      className="relative overflow-hidden bg-[#0B1121] text-white md:hidden"
      aria-label="Five-layer mattress foam construction"
    >
      <div className="container-site flex min-h-[88vh] flex-col justify-center py-10">
        <p className="font-heading text-4xl font-bold tracking-tight text-white">
          Engineered from the inside out.
        </p>
        <p className="mt-4 max-w-md text-base text-slate-300">
          Five precision foam layers, built around your specification.
        </p>

        <div className="relative mt-8 overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl shadow-primary/10">
          <div className="relative h-[360px]">
            {showFallback ? (
              <div className="relative h-full">
                <Image
                  src="/images/products/foam-layer-fallback.svg"
                  alt="Exploded five-layer mattress foam construction"
                  fill
                  className="object-cover opacity-80"
                  priority
                />
                <p className="absolute inset-x-0 bottom-0 bg-slate-950/85 p-3 text-center text-xs text-slate-300">
                  Interactive 3D unavailable — showing static preview.
                </p>
              </div>
            ) : (
              <Canvas
                camera={{ position: [5.8, 3.4, 6.8], fov: 42 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
                onCreated={({ gl }) => {
                  gl.setClearColor("#0B1121", 1);
                }}
              >
                <MobileScene
                  selected={selected}
                  hovered={hovered}
                  exploded={exploring}
                  reduceMotion={reduceMotion}
                  onSelect={setSelected}
                  onHover={setHovered}
                />
              </Canvas>
            )}
          </div>

          {exploring && (
            <div className="border-t border-slate-800 bg-slate-950 p-4 pb-8">
              <div
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: active.color }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-heading font-semibold text-white">{active.name}</p>
                    <p className="text-sm text-cyan-300">{active.material}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-300">{active.detail}</p>
              </div>

              <div
                className="mt-4 flex gap-2 overflow-x-auto pb-1"
                role="list"
                aria-label="Mattress layers"
              >
                {mattressLayers.map((layer, index) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelected(index)}
                    onFocus={() => setHovered(index)}
                    onBlur={() => setHovered(null)}
                    aria-pressed={selected === index}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-medium transition-colors",
                      selected === index
                        ? "border-cyan-400 bg-cyan-400/15 text-white"
                        : "border-slate-700 bg-slate-900/60 text-slate-300",
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: layer.color }}
                      aria-hidden
                    />
                    {layer.name}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Tap a layer chip or the model. Drag to rotate.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="border-slate-600 text-slate-200"
            aria-pressed={exploring}
            onClick={() => setExploring((current) => !current)}
          >
            <Layers3 className="size-4" />
            {exploring ? "Hide layers" : "Explore layers"}
          </Button>
          <Button asChild size="lg" variant="gradient" className="shadow-lg shadow-primary/25">
            <TrackedLink href="/contact/" event="cta_click" eventParams={{ cta_id: "start-your-project" }}>
              Start Your Project <ArrowRight />
            </TrackedLink>
          </Button>
        </div>
      </div>
    </section>
  );
}

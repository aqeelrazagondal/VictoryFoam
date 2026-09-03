"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { MathUtils, type Mesh } from "three";

const layers = [
  {
    name: "Top cover",
    material: "Knitted comfort cover",
    detail: "Creates a breathable, soft-touch sleeping surface.",
    color: "#f5f0e8",
    height: 0.2,
    explodedY: 2,
    assembledY: 1.05,
  },
  {
    name: "Comfort layer",
    material: "Open-cell cooling foam",
    detail: "Improves airflow and cushions immediate surface pressure.",
    color: "#93c5fd",
    height: 0.45,
    explodedY: 1,
    assembledY: 0.7,
  },
  {
    name: "Memory foam",
    material: "Viscoelastic foam",
    detail: "Contours to the body and redistributes pressure.",
    color: "#6366f1",
    height: 0.65,
    explodedY: 0,
    assembledY: 0.15,
  },
  {
    name: "Transition layer",
    material: "High-resilience transition foam",
    detail: "Balances deep comfort with progressive support.",
    color: "#2dd4bf",
    height: 0.35,
    explodedY: -1,
    assembledY: -0.38,
  },
  {
    name: "Support base",
    material: "High-density support foam",
    detail: "Stabilises the construction and carries long-term load.",
    color: "#64748b",
    height: 0.9,
    explodedY: -2,
    assembledY: -1.03,
  },
];

function FoamLayer({
  layer,
  index,
  selected,
  hovered,
  exploded,
  setSelected,
  setHovered,
  reduceMotion,
}: {
  layer: (typeof layers)[number];
  index: number;
  selected: number;
  hovered: number | null;
  exploded: boolean;
  setSelected: (index: number) => void;
  setHovered: (index: number | null) => void;
  reduceMotion: boolean;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const targetY = exploded ? layer.explodedY : layer.assembledY;
    meshRef.current.position.y = reduceMotion
      ? targetY
      : MathUtils.lerp(meshRef.current.position.y, targetY, 0.09);
    const highlighted = hovered === index || selected === index;
    const targetScale = highlighted ? 1.035 : 1;
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
      position={[0, layer.explodedY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        setSelected(index);
      }}
      onPointerEnter={() => setHovered(index)}
      onPointerLeave={() => setHovered(null)}
    >
      <meshStandardMaterial color={layer.color} roughness={0.78} />
    </RoundedBox>
  );
}

function FoamScene({
  selected,
  hovered,
  exploded,
  setSelected,
  setHovered,
  reduceMotion,
}: {
  selected: number;
  hovered: number | null;
  exploded: boolean;
  setSelected: (index: number) => void;
  setHovered: (index: number | null) => void;
  reduceMotion: boolean;
}) {
  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[4, 6, 4]} intensity={2.4} />
      <hemisphereLight args={["#dbeafe", "#64748b", 0.6]} />
      {layers.map((layer, index) => (
        <FoamLayer
          key={layer.name}
          layer={layer}
          index={index}
          selected={selected}
          hovered={hovered}
          exploded={exploded}
          setSelected={setSelected}
          setHovered={setHovered}
          reduceMotion={reduceMotion}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={11}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.45}
      />
    </>
  );
}

export default function FoamLayerViewerScene() {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [exploded, setExploded] = useState(true);
  const [reduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [inView, setInView] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const activeLayer = layers[hovered ?? selected];

  useEffect(() => {
    const element = viewerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.1 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewerRef}
      className="grid overflow-hidden rounded-xl border border-slate-700 bg-slate-950 lg:grid-cols-[1.5fr_1fr]"
    >
      <div className="h-[360px] md:h-[460px]" aria-hidden="true">
        <Canvas
          camera={{ position: [6, 4, 7], fov: 42 }}
          frameloop={inView ? "always" : "never"}
          dpr={[1, 1.5]}
        >
          <FoamScene
            selected={selected}
            hovered={hovered}
            exploded={exploded}
            setSelected={setSelected}
            setHovered={setHovered}
            reduceMotion={reduceMotion}
          />
        </Canvas>
      </div>
      <div className="border-t border-slate-800 p-6 text-slate-200 lg:border-l lg:border-t-0">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            aria-pressed={exploded}
            onClick={() => setExploded((current) => !current)}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-sky-400"
          >
            {exploded ? "Assembled View" : "Exploded View"}
          </button>
        </div>
        <div
          className="mt-5 rounded-lg border border-sky-400/30 bg-sky-400/10 p-4"
          aria-live="polite"
        >
          <p className="font-heading font-semibold">{activeLayer.name}</p>
          <p className="mt-1 text-sm text-sky-300">{activeLayer.material}</p>
          <p className="mt-2 text-sm text-slate-400">{activeLayer.detail}</p>
        </div>
        <div className="mt-5 grid gap-2" role="list" aria-label="Foam layers">
          {layers.map((layer, index) => (
            <button
              key={layer.name}
              type="button"
              onClick={() => setSelected(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              aria-pressed={selected === index}
              className="rounded-lg border border-slate-800 px-4 py-3 text-left transition-[border-color,background-color,box-shadow] hover:border-sky-500 aria-pressed:border-sky-400 aria-pressed:bg-sky-400/10 aria-pressed:shadow-[0_0_18px_rgba(56,189,248,0.35)]"
            >
              <span className="block font-medium">{layer.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-400">
          Drag to rotate, scroll to zoom, or choose a layer.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferGeometry, Float32BufferAttribute, Points } from "three";

type FoamParticlesProps = {
  count?: number;
  active?: boolean;
};

export function FoamParticles({ count = 800, active = true }: FoamParticlesProps) {
  const pointsRef = useRef<Points>(null);
  const velocities = useMemo(
    () => Float32Array.from({ length: count }, () => 0.002 + Math.random() * 0.004),
    [count],
  );

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;
    const attribute = pointsRef.current.geometry.getAttribute("position");
    const array = attribute.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const yIndex = i * 3 + 1;
      array[yIndex] += velocities[i] * (delta * 60) * 0.35;
      if (array[yIndex] > 6) {
        array[yIndex] = -6;
        array[i * 3] = (Math.random() - 0.5) * 18;
        array[i * 3 + 2] = (Math.random() - 0.5) * 14;
      }
    }
    attribute.needsUpdate = true;
    pointsRef.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#38BDF8"
        size={0.035}
        transparent
        opacity={0.28}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

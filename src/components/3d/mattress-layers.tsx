"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, MathUtils, type Mesh, type MeshStandardMaterial } from "three";

import {
  LAYER_DEPTH,
  LAYER_WIDTH,
  type MattressLayer,
} from "@/data/mattress-scroll";

type MattressLayerMeshProps = {
  layer: MattressLayer;
  y: number;
  opacity: number;
  highlighted: boolean;
  interactive?: boolean;
  onSelect?: () => void;
  onHover?: (hovered: boolean) => void;
  reduceMotion?: boolean;
};

export function MattressLayerMesh({
  layer,
  y,
  opacity,
  highlighted,
  interactive = false,
  onSelect,
  onHover,
  reduceMotion = false,
}: MattressLayerMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const currentY = useRef(y);
  const currentOpacity = useRef(opacity);
  const currentEmissive = useRef(0);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;

    if (reduceMotion) {
      meshRef.current.position.y = y;
      materialRef.current.opacity = opacity;
      materialRef.current.emissiveIntensity = highlighted ? 0.35 : 0;
      meshRef.current.scale.setScalar(highlighted ? 1.03 : 1);
      return;
    }

    currentY.current = MathUtils.lerp(currentY.current, y, 0.12);
    currentOpacity.current = MathUtils.lerp(currentOpacity.current, opacity, 0.12);
    currentEmissive.current = MathUtils.lerp(
      currentEmissive.current,
      highlighted ? 0.45 : 0,
      0.12,
    );
    const targetScale = highlighted ? 1.035 : 1;
    const scale = MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.14);

    meshRef.current.position.y = currentY.current;
    meshRef.current.scale.setScalar(scale);
    materialRef.current.opacity = currentOpacity.current;
    materialRef.current.emissiveIntensity = currentEmissive.current;
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[LAYER_WIDTH, layer.height, LAYER_DEPTH]}
      radius={Math.min(0.16, layer.height / 3)}
      smoothness={4}
      position={[0, y, 0]}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onSelect?.();
            }
          : undefined
      }
      onPointerEnter={interactive ? () => onHover?.(true) : undefined}
      onPointerLeave={interactive ? () => onHover?.(false) : undefined}
    >
      <meshStandardMaterial
        ref={materialRef}
        color={layer.color}
        roughness={layer.roughness}
        metalness={0.05}
        transparent
        opacity={opacity}
        emissive={new Color(layer.color)}
        emissiveIntensity={highlighted ? 0.35 : 0}
        depthWrite={opacity > 0.5}
      />
    </RoundedBox>
  );
}

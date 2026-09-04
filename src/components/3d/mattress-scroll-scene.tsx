"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, Vector3, type Mesh, type MeshStandardMaterial } from "three";
import { RoundedBox } from "@react-three/drei";

import { FoamParticles } from "@/components/3d/foam-particles";
import {
  LAYER_DEPTH,
  LAYER_WIDTH,
  mattressLayers,
  type MattressLayer,
} from "@/data/mattress-scroll";
import { layerY, useCinema } from "@/lib/cinema-state";

type MattressScrollSceneProps = {
  reduceMotion: boolean;
  particleCount?: number;
  active?: boolean;
};

function CameraRig({ reduceMotion }: { reduceMotion: boolean }) {
  const { camera } = useThree();
  const { stateRef } = useCinema();
  const lookAt = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const { camera: target } = stateRef.current;
    if (reduceMotion) {
      camera.position.set(target.x, target.y, target.z);
      camera.lookAt(target.lookX, target.lookY, target.lookZ);
      return;
    }
    camera.position.x = MathUtils.lerp(camera.position.x, target.x, 0.08);
    camera.position.y = MathUtils.lerp(camera.position.y, target.y, 0.08);
    camera.position.z = MathUtils.lerp(camera.position.z, target.z, 0.08);
    lookAt.set(
      MathUtils.lerp(lookAt.x, target.lookX, 0.08),
      MathUtils.lerp(lookAt.y, target.lookY, 0.08),
      MathUtils.lerp(lookAt.z, target.lookZ, 0.08),
    );
    camera.lookAt(lookAt);
  });

  return null;
}

function DrivenLayer({
  layer,
  reduceMotion,
}: {
  layer: MattressLayer;
  reduceMotion: boolean;
}) {
  const { stateRef } = useCinema();
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    const { explode, opacities, highlight } = stateRef.current;
    const targetY = layerY(layer.id, explode);
    const targetOpacity = opacities[layer.id] ?? 1;
    const highlighted = highlight === layer.id;

    if (reduceMotion) {
      meshRef.current.position.y = targetY;
      materialRef.current.opacity = targetOpacity;
      materialRef.current.emissiveIntensity = highlighted ? 0.4 : 0;
      meshRef.current.scale.setScalar(highlighted ? 1.03 : 1);
      return;
    }

    meshRef.current.position.y = MathUtils.lerp(meshRef.current.position.y, targetY, 0.12);
    materialRef.current.opacity = MathUtils.lerp(materialRef.current.opacity, targetOpacity, 0.12);
    materialRef.current.emissiveIntensity = MathUtils.lerp(
      materialRef.current.emissiveIntensity,
      highlighted ? 0.45 : 0,
      0.12,
    );
    const scale = MathUtils.lerp(meshRef.current.scale.x, highlighted ? 1.035 : 1, 0.14);
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[LAYER_WIDTH, layer.height, LAYER_DEPTH]}
      radius={Math.min(0.16, layer.height / 3)}
      smoothness={4}
      position={[0, layer.assembledY, 0]}
    >
      <meshStandardMaterial
        ref={materialRef}
        color={layer.color}
        roughness={layer.roughness}
        metalness={0.05}
        transparent
        opacity={1}
        emissive={layer.color}
        emissiveIntensity={0}
        depthWrite
      />
    </RoundedBox>
  );
}

export function MattressScrollScene({
  reduceMotion,
  particleCount = 800,
  active = true,
}: MattressScrollSceneProps) {
  return (
    <>
      <color attach="background" args={["#0B1121"]} />
      <fog attach="fog" args={["#0B1121", 18, 36]} />
      <ambientLight intensity={0.55} />
      <spotLight
        position={[5, 8, 5]}
        intensity={2.2}
        angle={0.55}
        penumbra={0.85}
        castShadow
        shadow-mapSize={1024}
      />
      <spotLight position={[-3, 4, -2]} intensity={0.7} color="#38BDF8" />
      <pointLight position={[0, 2, 4]} intensity={0.55} color="#A78BFA" />
      <directionalLight position={[2, 6, 3]} intensity={1.1} />
      <FoamParticles count={particleCount} active={active && !reduceMotion} />
      {mattressLayers.map((layer) => (
        <DrivenLayer key={layer.id} layer={layer} reduceMotion={reduceMotion} />
      ))}
      <ContactShadows position={[0, -1.9, 0]} opacity={0.35} blur={2.2} far={6} />
      <CameraRig reduceMotion={reduceMotion} />
    </>
  );
}

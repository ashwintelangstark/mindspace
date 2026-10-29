import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { agents, stepRoam } from "../sim/roam";
import { makeFaceTexture, makeNameTagTexture } from "./textures";

// Roblox-style blocky traders. Per-frame values live in refs; the single
// useFrame in <Characters> steps the sim and drives every rig.

type Feature = "horns" | "ears" | "antlers" | "rabbitEars";

interface Look {
  skin: string;
  hair: string;
  suit: string;
  accent: string;
  feature: Feature;
}

const LOOKS: Record<string, Look> = {
  bull: { skin: "#c98850", hair: "#2a1c10", suit: "#17191d", accent: "#2ecc7f", feature: "horns" },
  bear: { skin: "#9c6636", hair: "#241508", suit: "#1a1418", accent: "#e05555", feature: "ears" },
  stag: { skin: "#b07a42", hair: "#33220f", suit: "#15181c", accent: "#2ecc7f", feature: "antlers" },
  rabbit: { skin: "#e8e4dd", hair: "#dcd6cc", suit: "#191b1f", accent: "#2ecc7f", feature: "rabbitEars" },
};

let cachedFace: THREE.CanvasTexture | null = null;
function getFaceTexture(): THREE.CanvasTexture {
  if (!cachedFace) cachedFace = makeFaceTexture();
  return cachedFace;
}

function AnimalFeature({ feature, skin }: { feature: Feature; skin: string }) {
  switch (feature) {
    case "horns":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.24, 0.26, 0]} rotation={[-0.5, 0, s * 0.7]}>
              <mesh position={[0, 0.17, 0]}>
                <coneGeometry args={[0.07, 0.34, 8]} />
                <meshStandardMaterial color="#e8ddc8" roughness={0.5} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "ears":
      return (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.2, 0.3, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.05, 12]} />
              <meshStandardMaterial color={skin} roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    case "antlers":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.18, 0.28, 0]} rotation={[-0.25, 0, s * 0.35]}>
              <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.028, 0.04, 0.5, 6]} />
                <meshStandardMaterial color="#cbb28a" roughness={0.6} />
              </mesh>
              <mesh position={[s * 0.09, 0.3, 0]} rotation={[0, 0, s * -0.9]}>
                <cylinderGeometry args={[0.02, 0.028, 0.22, 6]} />
                <meshStandardMaterial color="#cbb28a" roughness={0.6} />
              </mesh>
              <mesh position={[s * 0.08, 0.14, 0]} rotation={[0, 0, s * -1.0]}>
                <cylinderGeometry args={[0.018, 0.026, 0.2, 6]} />
                <meshStandardMaterial color="#cbb28a" roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "rabbitEars":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.19, 0.3, 0]} rotation={[-0.12, 0, s * 0.2]}>
              <mesh position={[0, 0.26, 0]}>
                <boxGeometry args={[0.11, 0.52, 0.05]} />
                <meshStandardMaterial color={skin} roughness={0.8} />
              </mesh>
              <mesh position={[0, 0.26, 0.031]}>
                <boxGeometry args={[0.05, 0.4, 0.01]} />
                <meshStandardMaterial color="#f3b8c4" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </group>
      );
  }
}

function Trader({ index }: { index: number }) {
  const agent = agents[index];
  const look = LOOKS[agent.id]!;

  const tag = useMemo(() => makeNameTagTexture(agent.name), [agent.name]);

  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  // rig registry read by the single <Characters> stepper
  rigs[index] = { armL, armR, legL, legR, body };

  return (
    <group>
      {/* torso: suit */}
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[0.64, 0.66, 0.36]} />
        <meshStandardMaterial color={look.suit} roughness={0.55} />
      </mesh>
      {/* shirt + tie stripe */}
      <mesh position={[0, 1.02, 0.185]}>
        <boxGeometry args={[0.18, 0.5, 0.01]} />
        <meshStandardMaterial color="#e8e6e2" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.0, 0.196]}>
        <boxGeometry args={[0.07, 0.44, 0.01]} />
        <meshStandardMaterial color={look.accent} roughness={0.5} />
      </mesh>
      {/* suit lapel hint */}
      <mesh position={[0, 1.16, 0.186]}>
        <boxGeometry args={[0.5, 0.14, 0.01]} />
        <meshStandardMaterial color={look.suit} roughness={0.55} />
      </mesh>

      {/* head */}
      <group position={[0, 1.55, 0]}>
        <mesh>
          <boxGeometry args={[0.52, 0.46, 0.5]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
        {/* face decal */}
        <mesh position={[0, -0.02, 0.253]}>
          <planeGeometry args={[0.5, 0.44]} />
          <meshBasicMaterial map={getFaceTexture()} transparent toneMapped={false} />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 0.14, -0.02]}>
          <boxGeometry args={[0.55, 0.2, 0.53]} />
          <meshStandardMaterial color={look.hair} roughness={0.85} />
        </mesh>
        <AnimalFeature feature={look.feature} skin={look.skin} />
      </group>

      {/* name tag */}
      <sprite position={[0, 2.15, 0]} scale={[0.85, 0.27, 1]}>
        <spriteMaterial map={tag} transparent toneMapped={false} depthWrite={false} />
      </sprite>

      {/* arms (pivot at shoulder) */}
      <group ref={armL} position={[-0.42, 1.24, 0]}>
        <mesh position={[0, -0.27, 0]}>
          <boxGeometry args={[0.2, 0.44, 0.22]} />
          <meshStandardMaterial color={look.suit} roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.56, 0]}>
          <boxGeometry args={[0.19, 0.18, 0.21]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
      </group>
      <group ref={armR} position={[0.42, 1.24, 0]}>
        <mesh position={[0, -0.27, 0]}>
          <boxGeometry args={[0.2, 0.44, 0.22]} />
          <meshStandardMaterial color={look.suit} roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.56, 0]}>
          <boxGeometry args={[0.19, 0.18, 0.21]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
      </group>

      {/* legs (pivot at hip) */}
      <group ref={legL} position={[-0.17, 0.64, 0]}>
        <mesh position={[0, -0.31, 0]}>
          <boxGeometry args={[0.26, 0.5, 0.28]} />
          <meshStandardMaterial color={look.suit} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.6, 0.02]}>
          <boxGeometry args={[0.27, 0.14, 0.32]} />
          <meshStandardMaterial color="#0d0f11" roughness={0.4} />
        </mesh>
      </group>
      <group ref={legR} position={[0.17, 0.64, 0]}>
        <mesh position={[0, -0.31, 0]}>
          <boxGeometry args={[0.26, 0.5, 0.28]} />
          <meshStandardMaterial color={look.suit} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.6, 0.02]}>
          <boxGeometry args={[0.27, 0.14, 0.32]} />
          <meshStandardMaterial color="#0d0f11" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

interface Rig {
  armL: RefObject<THREE.Group | null>;
  armR: RefObject<THREE.Group | null>;
  legL: RefObject<THREE.Group | null>;
  legR: RefObject<THREE.Group | null>;
  body: RefObject<THREE.Group | null>;
}

const rigs: Rig[] = [];

export function Characters() {
  const roots = useRef<(THREE.Group | null)[]>([null, null, null, null]);

  useEffect(() => () => { rigs.length = 0; }, []);

  // The one stepper: advance the sim, then write pose straight to the rigs.
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    stepRoam(dt);

    agents.forEach((agent, i) => {
      const root = roots.current[i];
      if (!root) return;
      const walking = agent.state === "walk";
      const swing = walking ? Math.sin(agent.walkPhase) * 0.6 : 0;
      const bob = walking ? Math.abs(Math.sin(agent.walkPhase)) * 0.035 : 0;

      root.position.set(agent.x, bob, agent.z);
      root.rotation.y = agent.angle;

      const rig = rigs[i];
      if (rig) {
        if (rig.legL.current) rig.legL.current.rotation.x = swing;
        if (rig.legR.current) rig.legR.current.rotation.x = -swing;
        if (rig.armL.current) rig.armL.current.rotation.x = -swing * 0.85;
        if (rig.armR.current) rig.armR.current.rotation.x = swing * 0.85;
        if (rig.body.current) rig.body.current.rotation.y = Math.sin(agent.walkPhase * 0.5) * 0.05;
      }

      // idle sway when standing still
      if (!walking) {
        const t = performance.now() / 1000;
        if (rig?.armL.current) rig.armL.current.rotation.x = Math.sin(t + i) * 0.05;
        if (rig?.armR.current) rig.armR.current.rotation.x = Math.sin(t + i + 2) * 0.05;
      }
    });
  });

  return (
    <group>
      {agents.map((agent, i) => (
        <group
          key={agent.id}
          ref={(g) => {
            roots.current[i] = g;
          }}
          position={[agent.x, 0, agent.z]}
        >
          <Trader index={i} />
        </group>
      ))}
    </group>
  );
}

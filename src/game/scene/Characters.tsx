import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { agents, stepRoam } from "../sim/roam";
import { makeFaceTexture, makeNameTagTexture } from "./textures";

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
  stag: {
    skin: "#b07a42",
    hair: "#33220f",
    suit: "#15181c",
    accent: "#2ecc7f",
    feature: "antlers",
  },
  rabbit: {
    skin: "#e8e4dd",
    hair: "#dcd6cc",
    suit: "#191b1f",
    accent: "#2ecc7f",
    feature: "rabbitEars",
  },
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

function CoffeeMug() {
  return (
    <group position={[0, -0.62, 0.12]} rotation={[0.2, 0, 0]}>
      {/* Mug body */}
      <mesh>
        <cylinderGeometry args={[0.065, 0.055, 0.14, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Coffee inside */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.055, 12]} />
        <meshBasicMaterial color="#3b1f0c" />
      </mesh>
      {/* Mug handle */}
      <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
    </group>
  );
}

function Trader({ index }: { index: number }) {
  const agent = agents[index]!;
  const look = LOOKS[agent.id]!;

  const tag = useMemo(() => makeNameTagTexture(agent.name), [agent.name]);

  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const mugRef = useRef<THREE.Group>(null);

  rigs[index] = { armL, armR, legL, legR, body, mugRef };

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
        {/* Coffee mug in right hand */}
        <group ref={mugRef} visible={false}>
          <CoffeeMug />
        </group>
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
  mugRef: RefObject<THREE.Group | null>;
}

const rigs: Rig[] = [];

export function Characters() {
  const roots = useRef<(THREE.Group | null)[]>([null, null, null, null]);

  useEffect(
    () => () => {
      rigs.length = 0;
    },
    [],
  );

  // The one stepper: advance the sim, then write pose straight to the rigs.
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    stepRoam(dt);

    agents.forEach((agent, i) => {
      const root = roots.current[i];
      if (!root) return;
      const rig = rigs[i];

      // 1. Sitting and working at desk
      if (agent.state === "work_at_desk") {
        root.position.set(agent.x, -0.22, agent.z);
        root.rotation.y = agent.angle;

        if (rig) {
          if (rig.mugRef.current) rig.mugRef.current.visible = false;
          // Legs bent forward 90 degrees sitting
          if (rig.legL.current) rig.legL.current.rotation.x = -Math.PI * 0.48;
          if (rig.legR.current) rig.legR.current.rotation.x = -Math.PI * 0.48;
          // Arms reaching forward onto desk typing
          const typePhase = agent.workPhase;
          if (rig.armL.current) {
            rig.armL.current.rotation.x = -1.25 + Math.sin(typePhase * 7) * 0.12;
            rig.armL.current.rotation.z = 0.2;
          }
          if (rig.armR.current) {
            rig.armR.current.rotation.x = -1.25 + Math.cos(typePhase * 7) * 0.12;
            rig.armR.current.rotation.z = -0.2;
          }
          if (rig.body.current) {
            rig.body.current.rotation.y = Math.sin(typePhase * 2) * 0.04;
          }
        }
        return;
      }

      // 2. Drinking coffee
      if (agent.state === "drink_coffee") {
        root.position.set(agent.x, 0, agent.z);
        root.rotation.y = agent.angle;

        if (rig) {
          if (rig.mugRef.current) rig.mugRef.current.visible = true;
          if (rig.legL.current) rig.legL.current.rotation.x = 0;
          if (rig.legR.current) rig.legR.current.rotation.x = 0;
          // Right arm lifting mug to mouth
          const sipAnim = Math.sin(agent.coffeePhase * 1.8);
          if (rig.armR.current) {
            rig.armR.current.rotation.x = -2.15 + sipAnim * 0.2;
            rig.armR.current.rotation.z = -0.35;
          }
          if (rig.armL.current) {
            rig.armL.current.rotation.x = 0.1;
            rig.armL.current.rotation.z = 0;
          }
          if (rig.body.current) {
            rig.body.current.rotation.y = 0;
          }
        }
        return;
      }

      // 3. Walking
      const walking = agent.state === "walk";
      const swing = walking ? Math.sin(agent.walkPhase) * 0.6 : 0;
      const bob = walking ? Math.abs(Math.sin(agent.walkPhase)) * 0.035 : 0;

      root.position.set(agent.x, bob, agent.z);
      root.rotation.y = agent.angle;

      if (rig) {
        if (rig.mugRef.current) rig.mugRef.current.visible = false;
        if (rig.legL.current) rig.legL.current.rotation.x = swing;
        if (rig.legR.current) rig.legR.current.rotation.x = -swing;
        if (rig.armL.current) {
          rig.armL.current.rotation.x = -swing * 0.85;
          rig.armL.current.rotation.z = 0;
        }
        if (rig.armR.current) {
          rig.armR.current.rotation.x = swing * 0.85;
          rig.armR.current.rotation.z = 0;
        }
        if (rig.body.current) rig.body.current.rotation.y = Math.sin(agent.walkPhase * 0.5) * 0.05;
      }

      // 4. Idle standing
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

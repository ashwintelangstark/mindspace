import { useMemo } from "react";
import * as THREE from "three";
import { makeBoardTexture, makeChartTexture, makeCityTexture, makeTickerTexture } from "./textures";

// Layout constants (1 unit = 1 m). Room: x in [-8, 8], z in [-6, 6].
const ROOM_W = 16;
const ROOM_D = 12;
const WALL_H = 4.4;

function WallTrim({ position, rotation, length }: { position: [number, number, number]; rotation?: number; length: number }) {
  return (
    <mesh position={position} rotation={[0, rotation ?? 0, 0]}>
      <boxGeometry args={[length, 0.035, 0.035]} />
      <meshBasicMaterial color="#ffb45e" toneMapped={false} />
    </mesh>
  );
}

function Desk({ position, rotation, chartUp }: { position: [number, number, number]; rotation: number; chartUp: boolean }) {
  const up = useMemo(() => makeChartTexture(chartUp ? "up" : "down"), [chartUp]);
  const flat = useMemo(() => makeChartTexture("flat"), [chartUp]);

  const monitors = [-0.65, 0, 0.65];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* desk top + panel */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[2.3, 0.07, 1.05]} />
        <meshStandardMaterial color="#1b1e22" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.38, -0.45]}>
        <boxGeometry args={[2.2, 0.7, 0.06]} />
        <meshStandardMaterial color="#15181c" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* legs */}
      <mesh position={[-1.05, 0.36, 0.4]}>
        <boxGeometry args={[0.08, 0.72, 0.08]} />
        <meshStandardMaterial color="#0e1013" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[1.05, 0.36, 0.4]}>
        <boxGeometry args={[0.08, 0.72, 0.08]} />
        <meshStandardMaterial color="#0e1013" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* monitors */}
      {monitors.map((x, i) => (
        <group key={i} position={[x, 1.06, -0.1]} rotation={[0, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.78, 0.5, 0.04]} />
            <meshStandardMaterial color="#0a0c0e" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.023]}>
            <planeGeometry args={[0.7, 0.42]} />
            <meshBasicMaterial map={i === 1 ? up : flat} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[0.1, 0.12, 0.1]} />
            <meshStandardMaterial color="#0a0c0e" />
          </mesh>
        </group>
      ))}

      {/* office chair */}
      <group position={[0, 0, 0.62]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.55, 0.09, 0.55]} />
          <meshStandardMaterial color="#101215" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.85, -0.24]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.52, 0.62, 0.08]} />
          <meshStandardMaterial color="#101215" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.44, 10]} />
          <meshStandardMaterial color="#1c1f23" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.22, 0.17, 0.36, 14]} />
        <meshStandardMaterial color="#22262b" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color="#2f6b3a" roughness={0.85} />
      </mesh>
      <mesh position={[0.16, 0.82, 0.08]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color="#3a7d45" roughness={0.85} />
      </mesh>
      <mesh position={[-0.15, 0.78, -0.1]}>
        <sphereGeometry args={[0.19, 10, 8]} />
        <meshStandardMaterial color="#275c32" roughness={0.85} />
      </mesh>
    </group>
  );
}

function TickerBoard({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const tex = useMemo(() => makeTickerTexture(), []);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[1.7, 3.5, 0.1]} />
        <meshStandardMaterial color="#0a0d10" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[1.55, 3.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Office() {
  const city = useMemo(() => makeCityTexture(), []);
  const board = useMemo(() => makeBoardTexture(), []);

  return (
    <group>
      {/* ---- floor ---- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#15171b" roughness={0.25} metalness={0.65} />
      </mesh>
      {/* rug under the lounge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 3.1]}>
        <planeGeometry args={[7.5, 4.4]} />
        <meshStandardMaterial color="#1d2024" roughness={0.95} metalness={0} />
      </mesh>

      {/* ---- ceiling + ring light ---- */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#0b0d10" roughness={0.9} />
      </mesh>
      <mesh position={[0, WALL_H - 0.08, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.9, 0.09, 12, 48]} />
        <meshBasicMaterial color="#ffca7a" toneMapped={false} />
      </mesh>
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <mesh key={x} position={[x, WALL_H - 0.03, -3]}>
          <boxGeometry args={[0.5, 0.05, 4.5]} />
          <meshBasicMaterial color="#f5e3c0" toneMapped={false} />
        </mesh>
      ))}

      {/* ---- window wall (back, z = -6) ---- */}
      {[-5.3, 0, 5.3].map((x) => (
        <mesh key={x} position={[x, 2.1, -6]}>
          <planeGeometry args={[5.2, 3.9]} />
          <meshPhysicalMaterial
            color="#9fd0e8"
            transparent
            opacity={0.07}
            roughness={0.05}
            metalness={0.1}
          />
        </mesh>
      ))}
      {/* mullions */}
      {[-8, -2.65, 2.65, 8].map((x) => (
        <mesh key={`m${x}`} position={[x, 2.1, -6]}>
          <boxGeometry args={[0.14, 4.4, 0.14]} />
          <meshStandardMaterial color="#0c0e11" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 4.15, -6]}>
        <boxGeometry args={[16.2, 0.16, 0.16]} />
        <meshStandardMaterial color="#0c0e11" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* ---- city skyline backdrop ---- */}
      <mesh position={[0, 3.2, -10.5]}>
        <planeGeometry args={[34, 16]} />
        <meshBasicMaterial map={city} toneMapped={false} fog={false} />
      </mesh>

      {/* ---- side walls with ticker boards ---- */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 8.05, 2.2, 0]} rotation={[0, -side * Math.PI * 0.5, 0]}>
            <planeGeometry args={[ROOM_D, WALL_H]} />
            <meshStandardMaterial color="#111318" roughness={0.8} />
          </mesh>
          <TickerBoard position={[side * 7.9, 2.1, -2.6]} rotation={-side * Math.PI * 0.5} />
          <TickerBoard position={[side * 7.9, 2.1, 2.2]} rotation={-side * Math.PI * 0.5} />
          <WallTrim position={[side * 7.95, 3.95, 0]} rotation={Math.PI * 0.5} length={ROOM_D - 0.6} />
          <WallTrim position={[side * 7.95, 0.35, 0]} rotation={Math.PI * 0.5} length={ROOM_D - 0.6} />
        </group>
      ))}

      {/* ---- big brand + index board above the window wall ---- */}
      <group position={[0, 3.0, -5.85]}>
        <mesh>
          <boxGeometry args={[10.5, 3.9, 0.12]} />
          <meshStandardMaterial color="#080b0d" roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[10.2, 3.65]} />
          <meshBasicMaterial map={board} toneMapped={false} />
        </mesh>
      </group>

      {/* ---- desk banks along the side walls ---- */}
      {[-1, 1].map((side) =>
        [-3.4, -0.2, 3.0].map((z, i) => (
          <Desk
            key={`${side}-${i}`}
            position={[side * 6.4, 0, z]}
            rotation={side === -1 ? Math.PI * 0.5 : -Math.PI * 0.5}
            chartUp={i % 2 === 0}
          />
        )),
      )}

      {/* ---- lounge: sofas + coffee table ---- */}
      {[-1, 1].map((side) => (
        <group key={`sofa${side}`} position={[side * 2.2, 0, 2.4]} rotation={[0, -side * Math.PI * 0.5, 0]}>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[2.4, 0.5, 0.95]} />
            <meshStandardMaterial color="#131519" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.75, -0.4]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[2.4, 0.7, 0.22]} />
            <meshStandardMaterial color="#131519" roughness={0.65} />
          </mesh>
          <mesh position={[-1.25, 0.5, 0]}>
            <boxGeometry args={[0.22, 0.62, 0.95]} />
            <meshStandardMaterial color="#131519" roughness={0.65} />
          </mesh>
          <mesh position={[1.25, 0.5, 0]}>
            <boxGeometry args={[0.22, 0.62, 0.95]} />
            <meshStandardMaterial color="#131519" roughness={0.65} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.26, 3.6]}>
        <cylinderGeometry args={[0.75, 0.75, 0.08, 24]} />
        <meshStandardMaterial color="#1b1e23" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 3.6]}>
        <cylinderGeometry args={[0.5, 0.6, 0.24, 20]} />
        <meshStandardMaterial color="#101317" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* ---- plants ---- */}
      <Plant position={[-7.2, 0, -5.1]} scale={1.3} />
      <Plant position={[7.2, 0, -5.1]} scale={1.3} />
      <Plant position={[-7.2, 0, 5.2]} scale={1.1} />
      <Plant position={[7.2, 0, 5.2]} scale={1.1} />
      <Plant position={[-2.8, 0, -5.2]} scale={0.9} />
      <Plant position={[2.8, 0, -5.2]} scale={0.9} />

      {/* ---- gold wall trims on the window wall ---- */}
      <WallTrim position={[0, 0.35, -5.92]} length={ROOM_W - 0.6} />
      <WallTrim position={[0, 4.15, -5.92]} length={ROOM_W - 0.6} />
    </group>
  );
}

export const ROOM_BOUNDS = { minX: -7.4, maxX: 7.4, minZ: -5.4, maxZ: 5.4, WALL_H };
export const CITY_TEXTURE_HINT = THREE.LinearFilter;

import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Office } from "./Office";
import { Characters } from "./Characters";
import { getSystemSkyAndWeather } from "./textures";

// Slow auto-orbit; the user can grab and look around at any time.
function CameraRig() {
  return (
    <OrbitControls
      target={[0, 1.2, -0.5]}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate
      autoRotateSpeed={0.35}
      minDistance={2.5}
      maxDistance={9}
      minPolarAngle={0.5}
      maxPolarAngle={1.42}
      minAzimuthAngle={-Math.PI / 2.4}
      maxAzimuthAngle={Math.PI / 2.4}
    />
  );
}

function Scene() {
  const envProfile = useMemo(() => getSystemSkyAndWeather(), []);

  return (
    <>
      <color attach="background" args={["#0a0c0f"]} />
      <fog attach="fog" args={["#0a0c0f", 22, 44]} />

      {/* Dynamic window wash matching the user's local system time & sky outside */}
      <directionalLight
        position={[0, 3.2, -12]}
        intensity={envProfile.windowLightIntensity}
        color={envProfile.windowLightColor}
      />
      <ambientLight intensity={envProfile.ambientIntensity} color={envProfile.ambientColor} />
      <hemisphereLight
        intensity={0.42}
        color={envProfile.hemiSkyColor}
        groundColor={envProfile.hemiGroundColor}
      />
      <pointLight position={[0, 3.6, 0]} intensity={7} color="#ffd9a0" distance={14} decay={2} />
      <pointLight position={[0, 2.6, -4]} intensity={5} color="#00e59a" distance={10} decay={2} />

      {/* Image-based lighting from light panels, responsive to user's time of day */}
      <Environment resolution={256}>
        <Lightformer
          intensity={2.4}
          color={envProfile.lightformerColor}
          position={[0, 4, -6]}
          scale={[16, 4, 1]}
        />
        <Lightformer
          intensity={0.8}
          color="#7fa8c9"
          position={[-6, 3, 2]}
          rotation-y={Math.PI / 2}
          scale={[10, 3, 1]}
        />
        <Lightformer
          intensity={0.8}
          color="#7fa8c9"
          position={[6, 3, 2]}
          rotation-y={-Math.PI / 2}
          scale={[10, 3, 1]}
        />
        <Lightformer
          intensity={1.2}
          color="#3a4552"
          position={[0, 5, 0]}
          rotation-x={Math.PI / 2}
          scale={[14, 10, 1]}
        />
      </Environment>

      <Office />
      <Characters />
      <CameraRig />
    </>
  );
}

export default function Game() {
  const wrapper = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapper}
      data-scene-ready="0"
      className="absolute inset-0"
      style={{ backgroundColor: "#0a0c0f" }}
    >
      <Canvas
        camera={{ position: [0, 3.1, 5.9], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={() => {
          // signal readiness after the first real frame has drawn
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (wrapper.current) wrapper.current.dataset["sceneReady"] = "1";
            });
          });
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

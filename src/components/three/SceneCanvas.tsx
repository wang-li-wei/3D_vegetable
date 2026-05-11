import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import GreenhouseScene from './GreenhouseScene';

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1890ff" wireframe />
    </mesh>
  );
}

function GroundGrid() {
  const gridHelper = useMemo(() => new THREE.GridHelper(30, 30, 0x1a3a5c, 0x0d1f33), []);
  return (
    <group position={[0, -0.01, 0]}>
      <primitive object={gridHelper} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={0x080e1a} roughness={1} />
      </mesh>
    </group>
  );
}

export default function SceneCanvas() {
  return (
    <Canvas
      shadows="soft"
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ background: '#0a1628' }}
    >
      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
        target={[0, 1.2, 0]}
      />
      <fog attach="fog" args={['#0a1628', 15, 30]} />
      <GroundGrid />
      <Suspense fallback={<LoadingFallback />}>
        <GreenhouseScene />
      </Suspense>
    </Canvas>
  );
}

import { useRef, useMemo, useCallback, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import type { SensorData } from '@/types';

const GH = { length: 10, width: 6, height: 3 };

const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

const sharedPipeMat = new THREE.MeshStandardMaterial({ color: 0x4488cc, metalness: 0.5, roughness: 0.4 });
const sharedNozzleBodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
const sharedNozzleTipMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 });
const sharedRootMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.9 });
const sharedCrownMat = new THREE.MeshStandardMaterial({ color: 0xe8f5e0, roughness: 0.8 });

function createWavyLeafGeometry(baseWidth: number, baseHeight: number, segments: number) {
  const geometry = new THREE.PlaneGeometry(baseWidth, baseHeight, segments, segments);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const xRatio = Math.abs(vertex.x) / (baseWidth / 2);
    const yRatio = vertex.y / baseHeight;
    vertex.z += Math.sin(yRatio * Math.PI * 3) * 0.08 * (1 - xRatio)
      + Math.sin(yRatio * Math.PI * 5 + 1.2) * 0.05 * (1 - xRatio)
      + Math.sin(xRatio * Math.PI * 2) * 0.06;
    vertex.y += Math.sin(xRatio * Math.PI * 3) * 0.04;
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const GreenhouseFrame = memo(function GreenhouseFrame() {
  const { length, width, height } = GH;

  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x889999, metalness: 0.8, roughness: 0.3 }),
    []
  );
  const coverMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        transmission: 0.85,
        roughness: 0.05,
        depthWrite: false,
      }),
    []
  );
  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 }),
    []
  );

  return (
    <group>
      {(
        [
          [-width / 2, height / 2, -length / 2],
          [width / 2, height / 2, -length / 2],
          [-width / 2, height / 2, length / 2],
          [width / 2, height / 2, length / 2],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={`p-${i}`} position={pos} material={frameMat}>
          <boxGeometry args={[0.08, height, 0.08]} />
        </mesh>
      ))}

      {(
        [
          [0, height, -length / 2],
          [0, height, length / 2],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={`b-${i}`} position={pos} material={frameMat}>
          <boxGeometry args={[width, 0.08, 0.08]} />
        </mesh>
      ))}

      {(
        [
          [-width / 2, height, 0],
          [width / 2, height, 0],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={`sb-${i}`} position={pos} material={frameMat}>
          <boxGeometry args={[0.08, 0.08, length]} />
        </mesh>
      ))}

      {Array.from({ length: 6 }).map((_, i) => {
        const z = -length / 2 + (i + 1) * (length / 7);
        return (
          <mesh key={`rb-${i}`} position={[0, height, z]} material={frameMat}>
            <boxGeometry args={[width, 0.06, 0.06]} />
          </mesh>
        );
      })}

      <mesh position={[0, height / 2, -length / 2]} material={coverMat}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, height / 2, length / 2]} rotation={[0, Math.PI, 0]} material={coverMat}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={coverMat}>
        <planeGeometry args={[length, height]} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} material={coverMat}>
        <planeGeometry args={[length, height]} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} material={coverMat}>
        <planeGeometry args={[width, length]} />
      </mesh>

      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[width, length]} />
      </mesh>

      <mesh position={[0, 0.15, -length / 2 + 0.04]} material={frameMat}>
        <boxGeometry args={[width - 0.5, 0.3, 0.08]} />
      </mesh>

      {Array.from({ length: 3 }).map((_, i) => {
        const z = -length / 2 + 1.5 + i * (length / 4);
        return (
          <group key={`vent-${i}`}>
            <mesh position={[width / 2 - 0.04, height - 0.3, z]} material={frameMat}>
              <boxGeometry args={[0.06, 0.4, 0.8]} />
            </mesh>
            <mesh position={[width / 2 - 0.02, height - 0.3, z]}>
              <planeGeometry args={[0.6, 0.3]} />
              <meshStandardMaterial color={0x88aacc} transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});

const Lettuce = memo(function Lettuce({
  position,
  growthDay,
}: {
  position: [number, number, number];
  growthDay: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = useMemo(() => {
    if (growthDay <= 14) return 0.05 + (growthDay / 14) * 0.1;
    if (growthDay <= 35) return 0.15 + ((growthDay - 14) / 21) * 0.2;
    return 0.35 + ((growthDay - 35) / 10) * 0.1;
  }, [growthDay]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + position[2] * 2) * 0.02;
  });

  const leafGeometries = useMemo(() => {
    const layers = growthDay <= 14 ? 2 : growthDay <= 35 ? 4 : 6;
    const leavesPerLayer = growthDay <= 14 ? 5 : 8;
    const geoms: THREE.BufferGeometry[] = [];
    for (let layer = 0; layer < layers; layer++) {
      const layerRatio = layer / layers;
      const leafScaleX = 0.3 * (1 - layerRatio * 0.3);
      const leafScaleY = 0.4 * (1 - layerRatio * 0.2);
      geoms.push(createWavyLeafGeometry(leafScaleX, leafScaleY, 10));
    }
    return geoms;
  }, [growthDay]);

  const leafMaterials = useMemo(() => {
    const layers = growthDay <= 14 ? 2 : growthDay <= 35 ? 4 : 6;
    const centerColor = new THREE.Color(0xb7eb8c);
    const midColor = new THREE.Color(0x73d13d);
    const edgeColor = new THREE.Color(0x389e0d);
    const mats: THREE.MeshPhysicalMaterial[] = [];
    for (let layer = 0; layer < layers; layer++) {
      const layerRatio = layer / layers;
      const c = layerRatio < 0.3
        ? centerColor.clone().lerp(midColor, layerRatio * 3)
        : midColor.clone().lerp(edgeColor, (layerRatio - 0.3) / 0.7);
      mats.push(new THREE.MeshPhysicalMaterial({
        color: c,
        roughness: 0.6,
        metalness: 0.0,
        transmission: 0.3,
        thickness: 0.1,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      }));
    }
    return mats;
  }, [growthDay]);

  const leafData = useMemo(() => {
    const layers = growthDay <= 14 ? 2 : growthDay <= 35 ? 4 : 6;
    const leavesPerLayer = growthDay <= 14 ? 5 : 8;
    const data: { layerIdx: number; angle: number; radius: number; height: number; tiltX: number; tiltZ: number }[] = [];
    for (let layer = 0; layer < layers; layer++) {
      const layerRatio = layer / layers;
      const numLeaves = Math.floor(leavesPerLayer * (1 - layerRatio * 0.5));
      const startAngle = layer * 0.3;
      const baseRadius = growthDay <= 14 ? 0.2 : growthDay <= 35 ? 0.3 : 0.4;
      for (let i = 0; i < numLeaves; i++) {
        const angle = startAngle + (i / numLeaves) * Math.PI * 2;
        data.push({
          layerIdx: layer,
          angle,
          radius: baseRadius * (1 - layerRatio * 0.4),
          height: 0.1 + layerRatio * (growthDay <= 14 ? 0.15 : growthDay <= 35 ? 0.25 : 0.35),
          tiltX: 0.5 + layerRatio * 0.3,
          tiltZ: 0.2 + layerRatio * 0.15,
        });
      }
    }
    return data;
  }, [growthDay]);

  const rootGeometries = useMemo(() => {
    const rootLength = growthDay <= 14 ? 0.25 : growthDay <= 35 ? 0.4 : 0.55;
    const rootCount = growthDay <= 14 ? 8 : 12;
    const geoms: THREE.TubeGeometry[] = [];
    for (let i = 0; i < rootCount; i++) {
      const angle = (i / rootCount) * Math.PI * 2;
      const radius = 0.03 + seededRandom(i * 17 + 3) * 0.02;
      const length = rootLength * (0.7 + seededRandom(i * 31 + 7) * 0.3);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.09, 0),
        new THREE.Vector3(Math.cos(angle) * radius * 2, -0.09 - length * 0.4, Math.sin(angle) * radius * 2),
        new THREE.Vector3(Math.cos(angle) * radius * 4, -0.09 - length * 0.7, Math.sin(angle) * radius * 4),
        new THREE.Vector3(Math.cos(angle) * radius * 3, -0.09 - length, Math.sin(angle) * radius * 3),
      ], false, 'chordal');
      geoms.push(new THREE.TubeGeometry(curve, 8, 0.008, 5, false));
    }
    return geoms;
  }, [growthDay]);

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {leafData.map((leaf, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(leaf.angle) * leaf.radius * 0.6,
            leaf.height,
            Math.sin(leaf.angle) * leaf.radius * 0.6,
          ]}
          rotation={[leaf.tiltX * Math.cos(leaf.angle), leaf.angle, leaf.tiltZ * Math.sin(leaf.angle)]}
          geometry={leafGeometries[leaf.layerIdx]}
          material={leafMaterials[leaf.layerIdx]}
          castShadow
        />
      ))}
      <mesh position={[0, -0.05, 0]} castShadow geometry={undefined}>
        <cylinderGeometry args={[0.04, 0.03, 0.08, 8]} />
        <meshStandardMaterial color={0xe8f5e0} roughness={0.8} />
      </mesh>
      {rootGeometries.map((geom, i) => (
        <mesh key={`root-${i}`} geometry={geom} material={sharedRootMat} castShadow />
      ))}
    </group>
  );
});

const PlantingShelf = memo(function PlantingShelf({
  position,
  layerIndex,
  growthDay,
}: {
  position: [number, number, number];
  layerIndex: number;
  growthDay: number;
}) {
  const shelfWidth = 1.2;
  const shelfDepth = 8;
  const holeSpacing = 0.8;
  const numHoles = 10;
  const tankWidth = shelfWidth * 0.33;
  const tankHeight = 0.07;
  const tankTopY = -0.05;
  const tankCenterY = tankTopY - tankHeight / 2;
  const tankBottomY = tankTopY - tankHeight;
  const liquidHeight = tankHeight * 0.8;
  const liquidCenterY = tankBottomY + liquidHeight / 2;

  const shelfMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.4 }),
    []
  );
  const trayMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 }),
    []
  );
  const tankWallMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: 0x556677,
      metalness: 0.2,
      roughness: 0.4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
    []
  );
  const nutrientMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      color: 0x2266aa,
      transparent: true,
      opacity: 0.55,
      transmission: 0.5,
      thickness: 0.05,
      roughness: 0.05,
      metalness: 0.0,
      emissive: 0x114488,
      emissiveIntensity: 0.12,
    }),
    []
  );

  return (
    <group position={position}>
      <mesh material={shelfMat} castShadow>
        <boxGeometry args={[shelfWidth, 0.04, shelfDepth]} />
      </mesh>
      <mesh position={[0, 0.03, 0]} material={trayMat}>
        <boxGeometry args={[shelfWidth - 0.1, 0.06, shelfDepth - 0.1]} />
      </mesh>
      
      <mesh position={[0, tankCenterY, 0]} material={tankWallMat}>
        <boxGeometry args={[tankWidth, tankHeight, shelfDepth - 0.1]} />
      </mesh>
      <mesh position={[0, liquidCenterY, 0]} material={nutrientMat}>
        <boxGeometry args={[tankWidth - 0.01, liquidHeight, shelfDepth - 0.12]} />
      </mesh>
      
      {Array.from({ length: numHoles }).map((_, i) => {
        const z = -((numHoles - 1) * holeSpacing) / 2 + i * holeSpacing;
        return (
          <Lettuce key={`l-${layerIndex}-${i}`} position={[0, 0.1, z]} growthDay={growthDay} />
        );
      })}
      
      {[-shelfWidth / 2 + 0.05, shelfWidth / 2 - 0.05].map((x, i) => (
        <mesh key={`e-${i}`} position={[x, 0.15, 0]} material={shelfMat}>
          <boxGeometry args={[0.04, 0.02, shelfDepth]} />
        </mesh>
      ))}
    </group>
  );
});

const ShelvingUnit = memo(function ShelvingUnit({
  position,
  growthDay,
}: {
  position: [number, number, number];
  growthDay: number;
}) {
  const layerHeight = 0.65;
  const numLayers = 3;
  const poleMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.3 }),
    []
  );

  const polePositions: [number, number][] = [
    [-0.55, -3.9],
    [-0.55, 3.9],
    [0.55, -3.9],
    [0.55, 3.9],
  ];

  return (
    <group position={position}>
      {polePositions.map(([x, z], i) => (
        <mesh key={`po-${i}`} position={[x, (numLayers * layerHeight) / 2 + 0.15, z]} material={poleMat}>
          <cylinderGeometry args={[0.025, 0.025, numLayers * layerHeight + 0.3, 8]} />
        </mesh>
      ))}
      {Array.from({ length: numLayers }).map((_, i) => (
        <PlantingShelf
          key={`sh-${i}`}
          position={[0, 0.3 + i * layerHeight, 0]}
          layerIndex={i}
          growthDay={growthDay}
        />
      ))}
    </group>
  );
});

const Pipe = memo(function Pipe({
  start,
  end,
  radius = 0.02,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
  color?: number;
}) {
  const { center, quaternion, len } = useMemo(() => {
    const dir = _v3.set(...end).sub(_v3.set(...start));
    const l = dir.length();
    const c = new THREE.Vector3(...start).add(dir.clone().multiplyScalar(0.5));
    const q = _q.setFromUnitVectors(_up, dir.clone().normalize());
    return { center: c, quaternion: q.clone(), len: l };
  }, [start, end]);

  return (
    <mesh position={center.toArray()} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, len, 6]} />
      <meshStandardMaterial color={0x4488cc} metalness={0.5} roughness={0.4} />
    </mesh>
  );
});

const MisterNozzleMesh = memo(function MisterNozzleMesh({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh castShadow material={sharedNozzleBodyMat}>
        <cylinderGeometry args={[0.012, 0.018, 0.04, 6]} />
      </mesh>
      <mesh position={[0, 0.025, 0]} material={sharedNozzleTipMat}>
        <cylinderGeometry args={[0.008, 0.012, 0.02, 6]} />
      </mesh>
    </group>
  );
});

function MisterParticles({ active }: { active: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const nozzlePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (const x of [-1.0, 1.0]) {
      for (const nozzleY of [0.22, 0.87, 1.52]) {
        for (let i = 0; i < 10; i++) {
          const z = -3.6 + i * 0.8;
          positions.push([x, nozzleY + 0.04, z]);
        }
      }
    }
    return positions;
  }, []);

  const countPerNozzle = 30;
  const totalParticles = nozzlePositions.length * countPerNozzle;

  const particleData = useMemo(() => {
    const offsets = new Float32Array(totalParticles * 3);
    const nozzleIndices = new Float32Array(totalParticles);
    for (let n = 0; n < nozzlePositions.length; n++) {
      for (let p = 0; p < countPerNozzle; p++) {
        const idx = n * countPerNozzle + p;
        offsets[idx * 3] = (Math.random() - 0.5) * 0.06;
        offsets[idx * 3 + 1] = Math.random() * 0.12;
        offsets[idx * 3 + 2] = (Math.random() - 0.5) * 0.06;
        nozzleIndices[idx] = n;
      }
    }
    return { offsets, nozzleIndices };
  }, [totalParticles, nozzlePositions.length]);

  const positions = useMemo(() => {
    const pos = new Float32Array(totalParticles * 3);
    for (let n = 0; n < nozzlePositions.length; n++) {
      const [nx, ny, nz] = nozzlePositions[n];
      for (let p = 0; p < countPerNozzle; p++) {
        const idx = n * countPerNozzle + p;
        pos[idx * 3] = nx + particleData.offsets[idx * 3];
        pos[idx * 3 + 1] = ny + particleData.offsets[idx * 3 + 1];
        pos[idx * 3 + 2] = nz + particleData.offsets[idx * 3 + 2];
      }
    }
    return pos;
  }, [nozzlePositions, particleData.offsets, totalParticles]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !active) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    for (let n = 0; n < nozzlePositions.length; n++) {
      const [nx, ny, nz] = nozzlePositions[n];
      for (let p = 0; p < countPerNozzle; p++) {
        const idx = n * countPerNozzle + p;
        let y = posAttr.getY(idx) + delta * 0.25;
        let x = posAttr.getX(idx) + (Math.random() - 0.5) * delta * 0.015;
        let z = posAttr.getZ(idx) + (Math.random() - 0.5) * delta * 0.015;
        if (y - ny > 0.12) {
          y = ny;
          x = nx + (Math.random() - 0.5) * 0.06;
          z = nz + (Math.random() - 0.5) * 0.06;
        }
        posAttr.setXYZ(idx, x, y, z);
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={0x88ddff} size={0.015} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

const Heater = memo(function Heater({
  position,
  active,
  onClick,
}: {
  position: [number, number, number];
  active: boolean;
  onClick?: () => void;
}) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!glowRef.current || !active) return;
    const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color={0x8b4513} metalness={0.6} roughness={0.4} />
      </mesh>
      {active && (
        <>
          <mesh ref={glowRef}>
            <cylinderGeometry args={[0.025, 0.025, 0.28, 8]} />
            <meshStandardMaterial color={0xff4400} emissive={0xff4400} emissiveIntensity={0.5} transparent opacity={0.7} />
          </mesh>
          <pointLight color={0xff4400} intensity={0.4} distance={0.8} />
        </>
      )}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.06, 6]} />
        <meshStandardMaterial color={0x444444} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
});

const Cooler = memo(function Cooler({
  position,
  active,
  onClick,
}: {
  position: [number, number, number];
  active: boolean;
  onClick?: () => void;
}) {
  const fanRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!fanRef.current || !active) return;
    fanRef.current.rotation.z += delta * 10;
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh>
        <boxGeometry args={[0.08, 0.06, 0.04]} />
        <meshStandardMaterial color={0x4488cc} metalness={0.5} roughness={0.4} />
      </mesh>
      <group ref={fanRef} position={[0, 0, 0.025]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]}>
            <boxGeometry args={[0.04, 0.01, 0.003]} />
            <meshStandardMaterial color={0xdddddd} />
          </mesh>
        ))}
      </group>
      {active && (
        <pointLight color={0x4488ff} intensity={0.3} distance={0.6} />
      )}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.04, 6]} />
        <meshStandardMaterial color={0x444444} metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
});

const SensorNode = memo(function SensorNode({
  position,
  label,
  value,
  unit,
  isAlarm,
  onClick,
  sensorType,
}: {
  position: [number, number, number];
  label: string;
  value: number;
  unit: string;
  isAlarm: boolean;
  onClick?: () => void;
  sensorType?: 'temp' | 'hum' | 'water' | 'light' | 'ph';
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !isAlarm) return;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
    meshRef.current.scale.setScalar(scale);
  });

  const sensorColor = useMemo(() => {
    switch (sensorType) {
      case 'temp': return 0xff6644;
      case 'hum': return 0x44aaff;
      case 'water': return 0x44cc88;
      case 'light': return 0xffcc00;
      case 'ph': return 0xcc44ff;
      default: return 0x44ff44;
    }
  }, [sensorType]);

  return (
    <group position={position} onClick={onClick}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial
          color={isAlarm ? 0xff4444 : sensorColor}
          emissive={isAlarm ? 0xff4444 : sensorColor}
          emissiveIntensity={isAlarm ? 0.6 : 0.15}
        />
      </mesh>
      {isAlarm && (
        <pointLight color={0xff4444} intensity={0.5} distance={2} />
      )}
      <Html position={[0, 0.08, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${isAlarm ? 'bg-red-900/80 text-red-300 border border-red-500/50' : 'bg-gray-900/80 text-gray-200 border border-gray-600/30'}`}>
          {label}: {value}{unit}
        </div>
      </Html>
    </group>
  );
});

const NutrientTankWithDevices = memo(function NutrientTankWithDevices({
  position,
  heaterActive,
  coolerActive,
  onHeaterClick,
  onCoolerClick,
}: {
  position: [number, number, number];
  heaterActive: boolean;
  coolerActive: boolean;
  onHeaterClick: () => void;
  onCoolerClick: () => void;
}) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = waterRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.08 + Math.sin(t * 1.5) * 0.03;
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.8, 20]} />
        <meshStandardMaterial color={0x336699} metalness={0.3} roughness={0.5} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.47, 0.47, 0.02, 20]} />
        <meshStandardMaterial color={0x445566} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={waterRef} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.55, 20]} />
        <meshStandardMaterial
          color={0x2266aa}
          transparent
          opacity={0.45}
          emissive={0x1144aa}
          emissiveIntensity={0.08}
        />
      </mesh>

      <Heater
        position={[0.15, 0.1, 0]}
        active={heaterActive}
        onClick={onHeaterClick}
      />
      <Cooler
        position={[-0.15, 0.1, 0]}
        active={coolerActive}
        onClick={onCoolerClick}
      />

      <Html position={[0.15, 0.65, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${heaterActive ? 'bg-red-900/80 text-red-300 border border-red-500/50' : 'bg-gray-800/80 text-gray-400'}`}>
          加热棒 {heaterActive ? 'ON' : 'OFF'}
        </div>
      </Html>
      <Html position={[-0.15, 0.65, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${coolerActive ? 'bg-blue-900/80 text-blue-300 border border-blue-500/50' : 'bg-gray-800/80 text-gray-400'}`}>
          制冷片 {coolerActive ? 'ON' : 'OFF'}
        </div>
      </Html>
      <Html position={[0, 0.9, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-blue-300 whitespace-nowrap border border-blue-500/30">
          营养液罐
        </div>
      </Html>
    </group>
  );
});

const SupplyPipes = memo(function SupplyPipes() {
  const tankZ = -4.3;
  const tankTopY = 0.8;
  const basePipeY = 0.22;

  return (
    <group>
      <Pipe start={[0, tankTopY, tankZ]} end={[0, basePipeY, tankZ]} radius={0.025} />
      <Pipe start={[0, basePipeY, tankZ]} end={[0, basePipeY, -3.9]} />
      <Pipe start={[0, basePipeY, -3.9]} end={[-1.0, basePipeY, -3.9]} />
      <Pipe start={[0, basePipeY, -3.9]} end={[1.0, basePipeY, -3.9]} />

      {[-1.0, 1.0].map((x) =>
        [0.22, 0.87, 1.52].map((baseY, li) => (
          <group key={`sp-${x}-${li}`}>
            <Pipe
              start={[x, li === 0 ? basePipeY : 0.22 + (li - 1) * 0.65 + 0.65, -3.9]}
              end={[x, baseY, -3.9]}
              radius={0.012}
            />
            <Pipe
              start={[x, baseY, -3.9]}
              end={[x, baseY, 3.9]}
              radius={0.012}
            />
          </group>
        ))
      )}
    </group>
  );
});

const GrowLight = memo(function GrowLight({
  position,
  intensity,
}: {
  position: [number, number, number];
  intensity: number;
}) {
  const lightIntensity = Math.min(intensity / 800, 1) * 0.8;
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.15, 0.03, 2.0]} />
        <meshStandardMaterial color={0x333333} metalness={0.5} roughness={0.5} />
      </mesh>
      {intensity > 50 && (
        <>
          <pointLight
            position={[0, -0.1, 0]}
            color={0xffeedd}
            intensity={lightIntensity}
            distance={3}
          />
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[0.12, 0.01, 1.8]} />
            <meshStandardMaterial
              color={0xffffcc}
              emissive={0xffffcc}
              emissiveIntensity={lightIntensity}
            />
          </mesh>
        </>
      )}
    </group>
  );
});

const ControlBox = memo(function ControlBox({ position }: { position: [number, number, number] }) {
  const ledRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ledRef.current) return;
    const t = state.clock.elapsedTime;
    (ledRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.3 + Math.sin(t * 2) * 0.2;
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.4, 0.15]} />
        <meshStandardMaterial color={0x555555} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh ref={ledRef} position={[0.08, 0.15, 0.08]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color={0x00ff00} emissive={0x00ff00} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.08, 0.15, 0.08]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color={0x1890ff} emissive={0x1890ff} emissiveIntensity={0.3} />
      </mesh>
      <Html position={[0, 0.3, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900/80 text-green-300 whitespace-nowrap border border-green-500/30">
          控制箱
        </div>
      </Html>
    </group>
  );
});

export default function GreenhouseScene() {
  const sensorData = useAppStore((s) => s.sensorData);
  const deviceStatus = useAppStore((s) => s.deviceStatus);
  const thresholds = useAppStore((s) => s.thresholds);
  const growthDay = useAppStore((s) => s.growthDay);
  const setSelectedDevice = useAppStore((s) => s.setSelectedDevice);

  const isAlarm = (key: keyof SensorData) => {
    const val = sensorData[key];
    const t = thresholds[key];
    return val > t.max || val < t.min;
  };

  const tankPos: [number, number, number] = [0, 0.4, -4.3];

  return (
    <group>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={[0x87ceeb, 0x3a3a3a, 0.3]} />

      <GreenhouseFrame />

      <ShelvingUnit position={[-1.0, 0, 0]} growthDay={growthDay} />
      <ShelvingUnit position={[1.0, 0, 0]} growthDay={growthDay} />

      <SupplyPipes />

      {[-1.0, 1.0].map((x) =>
        [0.22, 0.87, 1.52].map((nozzleY, li) => {
          const numHoles = 10;
          const holeSpacing = 0.8;
          return Array.from({ length: numHoles }).map((_, i) => {
            const z = -((numHoles - 1) * holeSpacing) / 2 + i * holeSpacing;
            return (
              <MisterNozzleMesh
                key={`m-${x}-${li}-${i}`}
                position={[x, nozzleY, z]}
              />
            );
          });
        })
      )}

      <MisterParticles active={deviceStatus.mister} />

      <group onClick={() => setSelectedDevice('nutrient_tank')}>
        <NutrientTankWithDevices
          position={tankPos}
          heaterActive={deviceStatus.heater}
          coolerActive={deviceStatus.cooler}
          onHeaterClick={() => setSelectedDevice('heater')}
          onCoolerClick={() => setSelectedDevice('cooler')}
        />
      </group>

      <SensorNode
        position={[-2.85, 1.5, 0]}
        label="环境温度"
        value={sensorData.air_temp}
        unit="℃"
        isAlarm={isAlarm('air_temp')}
        onClick={() => setSelectedDevice('air_temp_sensor')}
        sensorType="temp"
      />
      <SensorNode
        position={[-2.85, 1.8, 0]}
        label="环境湿度"
        value={sensorData.air_hum}
        unit="%"
        isAlarm={isAlarm('air_hum')}
        onClick={() => setSelectedDevice('air_hum_sensor')}
        sensorType="hum"
      />
      <SensorNode
        position={[0.4, 0.55, -4.3]}
        label="营养液温度"
        value={sensorData.nutrient_temp}
        unit="℃"
        isAlarm={isAlarm('nutrient_temp')}
        onClick={() => setSelectedDevice('nutrient_temp_sensor')}
        sensorType="water"
      />
      <SensorNode
        position={[0, 2.85, 2]}
        label="光照"
        value={sensorData.light}
        unit="lux"
        isAlarm={isAlarm('light')}
        onClick={() => setSelectedDevice('light_sensor')}
        sensorType="light"
      />
      <SensorNode
        position={[-0.4, 0.55, -4.3]}
        label="pH"
        value={sensorData.ph}
        unit=""
        isAlarm={isAlarm('ph')}
        onClick={() => setSelectedDevice('ph_sensor')}
        sensorType="ph"
      />

      <GrowLight position={[-1.0, 2.15, -2]} intensity={sensorData.light} />
      <GrowLight position={[-1.0, 2.15, 2]} intensity={sensorData.light} />
      <GrowLight position={[1.0, 2.15, -2]} intensity={sensorData.light} />
      <GrowLight position={[1.0, 2.15, 2]} intensity={sensorData.light} />

      <group onClick={() => setSelectedDevice('control_box')}>
        <ControlBox position={[2.3, 1.5, -4.3]} />
      </group>
    </group>
  );
}

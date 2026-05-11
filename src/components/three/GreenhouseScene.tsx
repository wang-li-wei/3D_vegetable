import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import type { SensorData } from '@/types';

function GreenhouseFrame() {
  const { length, width, height } = { length: 10, width: 6, height: 3 };

  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x889999, metalness: 0.8, roughness: 0.3 }),
    []
  );
  const coverMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        transmission: 0.6,
        roughness: 0.1,
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

      <mesh position={[-width / 2 + 0.04, 1.5, -length / 2 + 1.5]} material={frameMat}>
        <boxGeometry args={[0.06, 0.06, 1.2]} />
      </mesh>
      <mesh position={[-width / 2 + 0.04, 1.5, -length / 2 + 2.1]} material={frameMat}>
        <boxGeometry args={[0.06, 0.06, 1.2]} />
      </mesh>

      {Array.from({ length: 3 }).map((_, i) => {
        const z = -length / 2 + 1 + i * (length / 4);
        return (
          <group key={`vent-${i}`}>
            <mesh position={[width / 2 - 0.04, height - 0.3, z]} material={frameMat}>
              <boxGeometry args={[0.06, 0.4, 0.8]} />
            </mesh>
            <mesh position={[width / 2 - 0.02, height - 0.3, z]} rotation={[0, 0, 0]}>
              <planeGeometry args={[0.6, 0.3]} />
              <meshStandardMaterial color={0x88aacc} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Lettuce({
  position,
  growthDay,
}: {
  position: [number, number, number];
  growthDay: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scale, color } = useMemo(() => {
    let s = 0.1;
    let c = new THREE.Color(0x73d13d);
    if (growthDay <= 14) {
      s = 0.05 + (growthDay / 14) * 0.1;
      c = new THREE.Color(0x95de64);
    } else if (growthDay <= 35) {
      s = 0.15 + ((growthDay - 14) / 21) * 0.2;
      c = new THREE.Color(0x52c41a);
    } else {
      s = 0.35 + ((growthDay - 35) / 10) * 0.1;
      c = new THREE.Color(0x389e0d);
    }
    return { scale: s, color: c };
  }, [growthDay]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.3 + position[0] * 2) * 0.02;
  });

  const leafPositions = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const angle = (i / 8) * Math.PI * 2;
      const r = growthDay > 14 ? 0.35 : 0.25;
      return {
        angle,
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        tiltX: 0.4 * Math.cos(angle),
        tiltZ: 0.4 * Math.sin(angle),
      };
    });
  }, [growthDay]);

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {leafPositions.map((leaf, i) => (
        <mesh
          key={i}
          position={[leaf.x, 0.15, leaf.z]}
          rotation={[leaf.tiltX, leaf.angle, leaf.tiltZ]}
          castShadow
        >
          <sphereGeometry args={[0.22, 6, 4]} />
          <meshStandardMaterial color={color.clone().offsetHSL(0, 0, i % 2 === 0 ? 0.05 : -0.03)} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function PlantingShelf({
  position,
  layerIndex,
  growthDay,
}: {
  position: [number, number, number];
  layerIndex: number;
  growthDay: number;
}) {
  const shelfWidth = 4.5;
  const shelfDepth = 1.2;
  const holeSpacing = 0.4;
  const numHoles = 10;

  const shelfMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6, roughness: 0.4 }),
    []
  );
  const trayMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 }),
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
      {Array.from({ length: numHoles }).map((_, i) => {
        const x = -((numHoles - 1) * holeSpacing) / 2 + i * holeSpacing;
        return (
          <Lettuce key={`l-${layerIndex}-${i}`} position={[x, 0.1, 0]} growthDay={growthDay} />
        );
      })}
      {[-shelfDepth / 2 + 0.05, shelfDepth / 2 - 0.05].map((z, i) => (
        <mesh key={`e-${i}`} position={[0, 0.15, z]} material={shelfMat}>
          <boxGeometry args={[shelfWidth, 0.02, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

function ShelvingUnit({
  position,
  growthDay,
}: {
  position: [number, number, number];
  growthDay: number;
}) {
  const layerHeight = 0.8;
  const numLayers = 3;
  const poleMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.7, roughness: 0.3 }),
    []
  );

  return (
    <group position={position}>
      {[[-2.3, -0.55], [-2.3, 0.55], [2.3, -0.55], [2.3, 0.55]].map(([x, z], i) => (
        <mesh key={`po-${i}`} position={[x, (numLayers * layerHeight) / 2, z]} material={poleMat}>
          <cylinderGeometry args={[0.025, 0.025, numLayers * layerHeight, 8]} />
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
}

function Pipe({
  start,
  end,
  radius = 0.02,
  color = 0x4488cc,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
  color?: number;
}) {
  const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
  const len = direction.length();
  const center = new THREE.Vector3(...start).add(direction.clone().multiplyScalar(0.5));
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    return q;
  }, [direction]);

  return (
    <mesh position={center.toArray()} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, len, 8]} />
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

function MisterNozzle({
  position,
  active,
}: {
  position: [number, number, number];
  active: boolean;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 30;

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = -Math.random() * 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !active) return;
    const positions = particlesRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = positions.getY(i) - delta * 0.4;
      if (y < -0.4) {
        y = 0;
        positions.setX(i, (Math.random() - 0.5) * 0.4);
        positions.setZ(i, (Math.random() - 0.5) * 0.4);
      }
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.06, 8]} />
        <meshStandardMaterial color={0xcccccc} metalness={0.8} roughness={0.2} />
      </mesh>
      {active && (
        <points ref={particlesRef} position={[0, -0.03, 0]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial color={0x88ccff} size={0.025} transparent opacity={0.5} sizeAttenuation />
        </points>
      )}
    </group>
  );
}

function Heater({
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
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.4, 0.08]} />
        <meshStandardMaterial color={0x8b4513} metalness={0.6} roughness={0.4} />
      </mesh>
      {active && (
        <>
          <mesh ref={glowRef} position={[0, 0, 0.05]}>
            <boxGeometry args={[0.12, 0.35, 0.01]} />
            <meshStandardMaterial color={0xff4400} emissive={0xff4400} emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0, 0, 0.1]} color={0xff4400} intensity={0.3} distance={1} />
        </>
      )}
      <Html position={[0, 0.3, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-red-900/80 text-red-300' : 'bg-gray-800/80 text-gray-400'} whitespace-nowrap`}>
          加热棒 {active ? 'ON' : 'OFF'}
        </div>
      </Html>
    </group>
  );
}

function Cooler({
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
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.2, 0.1]} />
        <meshStandardMaterial color={0x4488cc} metalness={0.5} roughness={0.4} />
      </mesh>
      <group ref={fanRef} position={[0, 0, 0.06]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]}>
            <boxGeometry args={[0.08, 0.02, 0.005]} />
            <meshStandardMaterial color={0xdddddd} />
          </mesh>
        ))}
      </group>
      {active && (
        <pointLight position={[0, 0, 0.1]} color={0x4488ff} intensity={0.2} distance={1} />
      )}
      <Html position={[0, 0.18, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-blue-900/80 text-blue-300' : 'bg-gray-800/80 text-gray-400'} whitespace-nowrap`}>
          制冷片 {active ? 'ON' : 'OFF'}
        </div>
      </Html>
    </group>
  );
}

function SensorNode({
  position,
  label,
  value,
  unit,
  isAlarm,
  onClick,
}: {
  position: [number, number, number];
  label: string;
  value: number;
  unit: string;
  isAlarm: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !isAlarm) return;
    const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial
          color={isAlarm ? 0xff4444 : 0x44ff44}
          emissive={isAlarm ? 0xff4444 : 0x44ff44}
          emissiveIntensity={isAlarm ? 0.5 : 0.1}
        />
      </mesh>
      {isAlarm && (
        <pointLight color={0xff4444} intensity={0.5} distance={2} />
      )}
      <Html position={[0, 0.1, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${isAlarm ? 'bg-red-900/80 text-red-300 border border-red-500/50' : 'bg-gray-800/80 text-gray-300'}`}>
          {label}: {value}{unit}
        </div>
      </Html>
    </group>
  );
}

function NutrientPipes() {
  const pipeColor = 0x4488cc;
  return (
    <group>
      <Pipe start={[-4.5, 0.1, -2]} end={[-4.5, 0.1, 2]} radius={0.03} color={pipeColor} />
      <Pipe start={[4.5, 0.1, -2]} end={[4.5, 0.1, 2]} radius={0.03} color={pipeColor} />
      <Pipe start={[-4.5, 0.1, 0]} end={[4.5, 0.1, 0]} radius={0.03} color={pipeColor} />
      {[-2, 0, 2].map((z) => (
        <Pipe key={`vp-${z}`} start={[0, 0.1, z]} end={[0, 2.7, z]} radius={0.02} color={pipeColor} />
      ))}
      <Pipe start={[-4.5, 0.1, -2]} end={[-4.5, 2.7, -2]} radius={0.02} color={pipeColor} />
      <Pipe start={[4.5, 0.1, -2]} end={[4.5, 2.7, -2]} radius={0.02} color={pipeColor} />
      <Pipe start={[-4.5, 0.1, 2]} end={[-4.5, 2.7, 2]} radius={0.02} color={pipeColor} />
      <Pipe start={[4.5, 0.1, 2]} end={[4.5, 2.7, 2]} radius={0.02} color={pipeColor} />
    </group>
  );
}

function GrowLight({
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
        <boxGeometry args={[0.8, 0.03, 0.15]} />
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
            <boxGeometry args={[0.7, 0.01, 0.1]} />
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
}

function NutrientTank({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = waterRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.05 + Math.sin(t * 1.5) * 0.02;
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
        <meshStandardMaterial color={0x336699} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.02, 16]} />
        <meshStandardMaterial color={0x445566} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={waterRef} position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.25, 16]} />
        <meshStandardMaterial
          color={0x2266aa}
          transparent
          opacity={0.6}
          emissive={0x1144aa}
          emissiveIntensity={0.05}
        />
      </mesh>
      <Pipe start={[0, 0.5, 0]} end={[0, 0.5, -1]} radius={0.02} color={0x4488cc} />
      <Pipe start={[0, 0.5, 0]} end={[0.3, 0.5, 0]} radius={0.02} color={0x4488cc} />
      <Html position={[0, 0.55, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/80 text-blue-300 whitespace-nowrap border border-blue-500/30">
          营养液罐
        </div>
      </Html>
    </group>
  );
}

function ControlBox({ position }: { position: [number, number, number] }) {
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
        <div className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/80 text-green-300 whitespace-nowrap">
          控制箱
        </div>
      </Html>
    </group>
  );
}

export default function GreenhouseScene() {
  const sensorData = useAppStore((s) => s.sensorData);
  const deviceStatus = useAppStore((s) => s.deviceStatus);
  const thresholds = useAppStore((s) => s.thresholds);
  const growthDay = useAppStore((s) => s.growthDay);
  const setSelectedSensor = useAppStore((s) => s.setSelectedSensor);
  const setSelectedDevice = useAppStore((s) => s.setSelectedDevice);

  const isAlarm = (key: keyof SensorData) => {
    const val = sensorData[key];
    const t = thresholds[key];
    return val > t.max || val < t.min;
  };

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

      <ShelvingUnit position={[-2.5, 0, 0]} growthDay={growthDay} />
      <ShelvingUnit position={[2.5, 0, 0]} growthDay={growthDay} />

      <NutrientPipes />

      {[-2.5, 2.5].map((x) =>
        [0.5, 1.3, 2.1].map((y) => (
          <MisterNozzle
            key={`m-${x}-${y}`}
            position={[x, y, 0]}
            active={deviceStatus.mister}
          />
        ))
      )}

      <Heater position={[-4, 0.2, -3]} active={deviceStatus.heater} onClick={() => setSelectedDevice('heater')} />
      <Heater position={[4, 0.2, -3]} active={deviceStatus.heater} onClick={() => setSelectedDevice('heater')} />
      <Cooler position={[-4, 2.5, -3]} active={deviceStatus.cooler} onClick={() => setSelectedDevice('cooler')} />
      <Cooler position={[4, 2.5, -3]} active={deviceStatus.cooler} onClick={() => setSelectedDevice('cooler')} />

      <SensorNode
        position={[0, 2.5, -2.5]}
        label="环境温度"
        value={sensorData.air_temp}
        unit="℃"
        isAlarm={isAlarm('air_temp')}
        onClick={() => setSelectedDevice('air_temp_sensor')}
      />
      <SensorNode
        position={[0, 2.5, 2.5]}
        label="环境湿度"
        value={sensorData.air_hum}
        unit="%"
        isAlarm={isAlarm('air_hum')}
        onClick={() => setSelectedDevice('air_hum_sensor')}
      />
      <SensorNode
        position={[0, 0.2, 0]}
        label="营养液温度"
        value={sensorData.nutrient_temp}
        unit="℃"
        isAlarm={isAlarm('nutrient_temp')}
        onClick={() => setSelectedDevice('nutrient_temp_sensor')}
      />
      <SensorNode
        position={[0, 2.8, 0]}
        label="光照"
        value={sensorData.light}
        unit="lux"
        isAlarm={isAlarm('light')}
        onClick={() => setSelectedDevice('light_sensor')}
      />
      <SensorNode
        position={[0, 0.15, 1.5]}
        label="pH"
        value={sensorData.ph}
        unit=""
        isAlarm={isAlarm('ph')}
        onClick={() => setSelectedDevice('ph_sensor')}
      />

      <GrowLight position={[-2.5, 2.9, 0]} intensity={sensorData.light} />
      <GrowLight position={[2.5, 2.9, 0]} intensity={sensorData.light} />

      <group onClick={() => setSelectedDevice('nutrient_tank')}>
        <NutrientTank position={[0, 0.25, -4]} />
      </group>
      <group onClick={() => setSelectedDevice('control_box')}>
        <ControlBox position={[4.5, 1.5, -4.5]} />
      </group>
    </group>
  );
}

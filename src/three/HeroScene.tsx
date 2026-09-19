import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei'
import * as THREE from 'three'

interface Props { primary: string; secondary: string; accent: string; onChip: () => void; still: boolean }

function Core({ primary, secondary }: Pick<Props, 'primary' | 'secondary'>) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, d) => { if (ref.current) { ref.current.rotation.y += d * 0.18; ref.current.rotation.x += d * 0.07 } })
  return (
    <Float speed={1.4} floatIntensity={0.8} rotationIntensity={0.3}>
      <mesh ref={ref} scale={1.55}>
        <icosahedronGeometry args={[1, 3]} />
        <MeshDistortMaterial color={primary} emissive={secondary} emissiveIntensity={0.35} roughness={0.25} metalness={0.7} distort={0.38} speed={1.6} />
      </mesh>
      <mesh scale={1.95}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={secondary} wireframe transparent opacity={0.28} />
      </mesh>
    </Float>
  )
}

function Chip({ position, color, size = 0.34, onClick, led }: { position: [number, number, number]; color: string; size?: number; onClick?: () => void; led?: boolean }) {
  const [hover, setHover] = useState(false)
  const [on, setOn] = useState(false)
  const ledRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (ledRef.current) ledRef.current.emissiveIntensity = on ? 2.5 + Math.sin(clock.elapsedTime * 10) * 1.5 : 0.25
  })
  return (
    <group position={position}>
      <mesh
        scale={hover && onClick ? 1.25 : 1}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); if (onClick) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); if (onClick) { setOn(true); onClick() } }}
      >
        <boxGeometry args={[size * 1.6, size * 0.16, size]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
      </mesh>
      {led && (
        <mesh position={[size * 0.55, size * 0.12, 0]}>
          <sphereGeometry args={[size * 0.09, 12, 12]} />
          <meshStandardMaterial ref={ledRef} color="#22c55e" emissive="#22c55e" emissiveIntensity={0.25} />
        </mesh>
      )}
    </group>
  )
}

function Orbit({ accent, primary, secondary, onChip }: Pick<Props, 'accent' | 'primary' | 'secondary' | 'onChip'>) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, d) => { if (g.current) g.current.rotation.y += d * 0.22 })
  return (
    <group ref={g} rotation={[0.35, 0, 0.15]}>
      <Chip position={[3.1, 0.2, 0]} color={accent} size={0.5} onClick={onChip} led />
      <Chip position={[-2.6, -0.6, 1.4]} color={primary} />
      <Chip position={[0.6, 1.9, -2.6]} color={secondary} size={0.28} />
      <Chip position={[-1.2, -1.9, -2.4]} color={accent} size={0.26} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.1, 0.006, 8, 160]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

function Rig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.04
    camera.position.y += (pointer.y * 0.6 - camera.position.y) * 0.04
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function HeroScene({ primary, secondary, accent, onChip, still }: Props) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 7], fov: 48 }} frameloop={still ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 5, 5]} intensity={90} color={accent} />
      <pointLight position={[-6, -3, 3]} intensity={70} color={secondary} />
      <Core primary={primary} secondary={secondary} />
      <Orbit accent={accent} primary={primary} secondary={secondary} onChip={onChip} />
      <Stars radius={60} depth={40} count={still ? 600 : 1800} factor={3.2} fade speed={still ? 0 : 0.6} />
      {!still && <Rig />}
    </Canvas>
  )
}

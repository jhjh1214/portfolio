import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PresentationControls } from '@react-three/drei'
import * as THREE from 'three'

interface Props { pcb: string; accent: string; onBoot: () => void; still: boolean; neon?: boolean }

/** A stylised ESP32 dev board. Drag to rotate; press the BOOT button. In the Cyberpunk theme it glows and gets a wireframe halo. */
function Board({ pcb, accent, onBoot, neon }: Omit<Props, 'still'>) {
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const btn = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const [on, setOn] = useState(false)
  const [down, setDown] = useState(false)

  useFrame(({ clock }, d) => {
    if (led.current) led.current.emissiveIntensity = on ? 1.6 + Math.sin(clock.elapsedTime * 9) * 1.2 : neon ? 0.9 + Math.sin(clock.elapsedTime * 3) * 0.5 : 0.15
    if (btn.current) btn.current.position.y = THREE.MathUtils.lerp(btn.current.position.y, down ? 0.06 : 0.12, 0.35)
    if (halo.current) { halo.current.rotation.y += d * 0.35; halo.current.rotation.x += d * 0.12 }
  })

  const pins = Array.from({ length: 15 }, (_, i) => -1.4 + i * 0.2)
  return (
    <group rotation={[0.1, -0.55, 0]} scale={1.05}>
      {neon && (
        <mesh ref={halo} scale={2.3}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={accent} wireframe transparent opacity={0.28} />
        </mesh>
      )}
      <mesh>
        <boxGeometry args={[3.4, 0.12, 1.5]} />
        <meshStandardMaterial color={pcb} roughness={0.55} metalness={0.15} emissive={neon ? pcb : '#000000'} emissiveIntensity={neon ? 0.35 : 0} />
      </mesh>
      <mesh position={[-0.55, 0.16, 0]}>
        <boxGeometry args={[1.5, 0.2, 1.1]} />
        <meshStandardMaterial color="#c9ced4" metalness={0.9} roughness={0.25} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0.55 + i * 0.16, 0.09, i % 2 ? -0.28 : 0.28]}>
          <boxGeometry args={[0.1, 0.03, 0.42]} />
          <meshStandardMaterial color="#d9b44a" metalness={0.8} roughness={0.35} emissive={neon ? accent : '#000000'} emissiveIntensity={neon ? 0.6 : 0} />
        </mesh>
      ))}
      {[-0.68, 0.68].map((z) => pins.map((x) => (
        <mesh key={`${z}${x}`} position={[x * 1.05, 0.13, z]}>
          <cylinderGeometry args={[0.04, 0.04, 0.16, 8]} />
          <meshStandardMaterial color="#d9b44a" metalness={0.9} roughness={0.3} />
        </mesh>
      )))}
      <mesh position={[-1.62, 0.15, 0]}>
        <boxGeometry args={[0.36, 0.18, 0.5]} />
        <meshStandardMaterial color="#9aa1a9" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[1.25, 0.1, 0.45]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial ref={led} color={accent} emissive={accent} emissiveIntensity={0.15} />
      </mesh>
      <mesh
        ref={btn}
        position={[1.25, 0.12, -0.4]}
        onPointerDown={(e) => { e.stopPropagation(); setDown(true); setOn(true); onBoot() }}
        onPointerUp={() => setDown(false)}
        onPointerOut={() => { setDown(false); document.body.style.cursor = '' }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      >
        <cylinderGeometry args={[0.14, 0.14, 0.12, 20]} />
        <meshStandardMaterial color="#20262c" roughness={0.5} />
      </mesh>
    </group>
  )
}

export default function BoardScene({ pcb, accent, onBoot, still, neon }: Props) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 3.4, 4.6], fov: 34 }} frameloop={still ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={neon ? 0.45 : 0.7} />
      <directionalLight position={[3, 5, 4]} intensity={neon ? 1.6 : 2.2} />
      <hemisphereLight args={['#ffffff', '#445566', 0.8]} />
      {neon && <pointLight position={[-3, 1.5, 2]} intensity={40} color={accent} />}
      <PresentationControls global={false} snap speed={1.6} polar={[-0.5, 0.5]} azimuth={[-0.9, 0.9]}>
        <Board pcb={pcb} accent={accent} onBoot={onBoot} neon={neon} />
      </PresentationControls>
    </Canvas>
  )
}

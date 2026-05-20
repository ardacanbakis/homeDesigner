import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei'
import { Suspense, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../store/design'
import { Walls3D } from './Walls3D'
import { Furniture3D } from './Furniture3D'
import { designBounds, m } from './units'
import type { Design } from '../store/types'

type ControlsLike = { target: THREE.Vector3; update: () => void }

/** Frames the camera on the design's bounding box. */
function useFrameDesign() {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as ControlsLike | null

  return useCallback(
    (design: Design) => {
      const b = designBounds(design)
      // Default framing for an empty scene
      const center = new THREE.Vector3(0, 0, 0)
      let radius = 4

      if (b) {
        const cx = m((b.minX + b.maxX) / 2)
        const cz = m((b.minZ + b.maxZ) / 2)
        const width = m(b.maxX - b.minX)
        const depth = m(b.maxZ - b.minZ)
        const height = m(b.maxY)
        center.set(cx, Math.min(height / 2, 1.5), cz)
        radius = Math.max(width, depth, height, 2)
      }

      const dist = radius * 1.9 + 2
      camera.position.set(center.x + dist * 0.8, center.y + dist * 0.9, center.z + dist)
      camera.near = 0.1
      camera.far = dist * 20
      camera.updateProjectionMatrix()
      camera.lookAt(center)

      if (controls) {
        controls.target.copy(center)
        controls.update()
      }
    },
    [camera, controls]
  )
}

function SceneContent() {
  const design = useDesignStore(s => s.design)
  const setSelected = useDesignStore(s => s.setSelected)
  const controls = useThree(s => s.controls)
  const frame = useFrameDesign()

  // Re-frame on first mount, when OrbitControls becomes available, and
  // whenever the set of walls/furniture changes.
  const signature = `${design.walls.length}:${design.furniture.length}`
  useEffect(() => {
    frame(design)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, controls, frame])

  const b = designBounds(design)
  const floorSize = b
    ? Math.max(m(b.maxX - b.minX), m(b.maxZ - b.minZ)) + 4
    : 12
  const floorCenter: [number, number, number] = b
    ? [m((b.minX + b.maxX) / 2), 0, m((b.minZ + b.maxZ) / 2)]
    : [0, 0, 0]

  return (
    <>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2.02}
        minDistance={1}
        maxDistance={200}
      />
      <Environment preset="apartment" />
      <hemisphereLight args={['#ffffff', '#444455', 0.6]} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
      />

      {/* Ground: clickable to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={floorCenter}
        receiveShadow
        onClick={() => setSelected(null)}
      >
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color="#e9ebf0" roughness={1} />
      </mesh>

      <Grid
        position={[floorCenter[0], 0.002, floorCenter[2]]}
        args={[floorSize, floorSize]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#c2c6cf"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#9aa0ad"
        fadeDistance={floorSize * 1.5}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      <ContactShadows
        position={[floorCenter[0], 0.01, floorCenter[2]]}
        scale={floorSize}
        far={6}
        blur={2.5}
        opacity={0.35}
        resolution={1024}
      />

      <Walls3D walls={design.walls} />
      <Furniture3D furniture={design.furniture} />
    </>
  )
}

export function Scene3D() {
  return (
    <div className="absolute inset-0 bg-[#aab2c0]">
      <Canvas shadows camera={{ position: [6, 6, 8], fov: 50 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-700 bg-white/60 px-2 py-0.5 rounded-full pointer-events-none">
        Left-drag orbit · Right-drag pan · Scroll zoom · view auto-fits your layout
      </div>
    </div>
  )
}

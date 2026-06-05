import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Grid, Environment, ContactShadows } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useDesignStore, floorElevations } from '../store/design'
import { Walls3D } from './Walls3D'
import { Furniture3D } from './Furniture3D'
import { Rooms3D } from './Rooms3D'
import { designBounds, m } from './units'
import type { Design, CameraMode } from '../store/types'

type ControlsLike = { target: THREE.Vector3; update: () => void }

/** WASD + space/shift movement. Only active in 'walk' camera mode.
 *  Uses the camera's forward/right vectors so it walks in look direction. */
/* eslint-disable react-hooks/immutability */
function Walker({ enabled, floorBoundsRef }: {
  enabled: boolean
  floorBoundsRef: React.MutableRefObject<{ cx: number; cz: number; halfX: number; halfZ: number } | null>
}) {
  const camera = useThree(s => s.camera)
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (!enabled) return
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      keys.current[e.key.toLowerCase()] = true
    }
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      keys.current = {}
    }
  }, [enabled])

  useFrame((_, dt) => {
    if (!enabled) return
    const speed = (keys.current['shift'] ? 4.5 : 2.0) * dt // m/s (faster with shift)
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    let dx = 0, dz = 0
    if (keys.current['w']) { dx += forward.x * speed; dz += forward.z * speed }
    if (keys.current['s']) { dx -= forward.x * speed; dz -= forward.z * speed }
    if (keys.current['d']) { dx += right.x * speed; dz += right.z * speed }
    if (keys.current['a']) { dx -= right.x * speed; dz -= right.z * speed }

    if (dx || dz) {
      camera.position.x += dx
      camera.position.z += dz
      // Clamp inside the floor bounds (with some headroom) so you can't walk into the void.
      const b = floorBoundsRef.current
      if (b) {
        camera.position.x = Math.max(b.cx - b.halfX, Math.min(b.cx + b.halfX, camera.position.x))
        camera.position.z = Math.max(b.cz - b.halfZ, Math.min(b.cz + b.halfZ, camera.position.z))
      }
    }
  })

  return null
}
/* eslint-enable react-hooks/immutability */

/** Frames the camera on the design's bounding box.
 *  Mutating the camera returned from useThree is the standard r3f pattern;
 *  the react-hooks/immutability rule's false positive is silenced below. */
/* eslint-disable react-hooks/immutability */
function useFrameDesign() {
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as ControlsLike | null

  return useCallback(
    (design: Design) => {
      const b = designBounds(design)
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
/* eslint-enable react-hooks/immutability */

/** Camera placement for each non-walk preset. Always points at the floor center. */
function applyPreset(mode: CameraMode, camera: THREE.Camera, controls: ControlsLike | null, design: Design) {
  const b = designBounds(design)
  const cx = b ? m((b.minX + b.maxX) / 2) : 0
  const cz = b ? m((b.minZ + b.maxZ) / 2) : 0
  const width = b ? m(b.maxX - b.minX) : 6
  const depth = b ? m(b.maxZ - b.minZ) : 6
  const height = b ? m(b.maxY) : 3
  const radius = Math.max(width, depth, height, 2)
  const dist = radius * 1.9 + 2
  const target = new THREE.Vector3(cx, Math.min(height / 2, 1.5), cz)

  if (mode === 'top') camera.position.set(cx, dist * 1.4, cz + 0.001) // tiny offset so lookAt doesn't degenerate
  else if (mode === 'front') camera.position.set(cx, height / 2 + 0.5, cz + dist)
  else if (mode === 'iso') camera.position.set(cx + dist * 0.8, dist * 0.9, cz + dist)
  else camera.position.set(cx + dist * 0.8, dist * 0.9, cz + dist) // orbit default
  camera.lookAt(target)
  if (controls) { controls.target.copy(target); controls.update() }
}

function SceneContent({ onShotReady }: { onShotReady: (fn: () => void) => void }) {
  const design = useDesignStore(s => s.design)
  const activeFloorId = useDesignStore(s => s.activeFloorId)
  const cameraMode = useDesignStore(s => s.cameraMode)
  const isolate = useDesignStore(s => s.isolateActiveFloor)
  const setSelected = useDesignStore(s => s.setSelected)
  const camera = useThree(s => s.camera)
  const controls = useThree(s => s.controls) as ControlsLike | null
  const gl = useThree(s => s.gl)
  const scene = useThree(s => s.scene)
  const frame = useFrameDesign()
  const elevations = floorElevations(design.floors)

  // Re-frame on first mount and whenever the geometry meaningfully changes — but
  // only in orbit mode. The presets manage their own placement; walk mode is
  // entered from wherever the user already was.
  const signature = design.floors.map(f => `${f.walls.length}/${f.furniture.length}`).join('|')
  useEffect(() => {
    if (cameraMode === 'orbit') frame(design)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, controls, frame, cameraMode])

  // Apply preset whenever it changes (top/front/iso).
  useEffect(() => {
    if (cameraMode === 'top' || cameraMode === 'front' || cameraMode === 'iso') {
      applyPreset(cameraMode, camera, controls, design)
    }
    // Entering walk mode: drop the camera into a comfortable standing position
    // facing the floor center, then PointerLockControls takes over.
    if (cameraMode === 'walk') {
      const b = designBounds(design)
      const cx = b ? m((b.minX + b.maxX) / 2) : 0
      const cz = b ? m((b.minZ + b.maxZ) / 2) : 0
      camera.position.set(cx, 1.6, cz + 3) // eye level ~1.6 m, 3 m back from center
      camera.lookAt(new THREE.Vector3(cx, 1.4, cz))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMode])

  // Wire up the screenshot trigger to the parent.
  useEffect(() => {
    onShotReady(() => {
      gl.render(scene, camera)
      const dataUrl = gl.domElement.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `homedesign-3d-${Date.now()}.png`
      a.click()
    })
  }, [onShotReady, gl, scene, camera])

  const b = designBounds(design)
  const floorSize = b
    ? Math.max(m(b.maxX - b.minX), m(b.maxZ - b.minZ)) + 4
    : 12
  const floorCenter: [number, number, number] = b
    ? [m((b.minX + b.maxX) / 2), 0, m((b.minZ + b.maxZ) / 2)]
    : [0, 0, 0]

  const floorBoundsRef = useRef<{ cx: number; cz: number; halfX: number; halfZ: number } | null>(null)
  useEffect(() => {
    floorBoundsRef.current = b
      ? { cx: m((b.minX + b.maxX) / 2), cz: m((b.minZ + b.maxZ) / 2),
          halfX: m(b.maxX - b.minX) / 2 + 1, halfZ: m(b.maxZ - b.minZ) / 2 + 1 }
      : { cx: 0, cz: 0, halfX: 10, halfZ: 10 }
  }, [b])

  return (
    <>
      {cameraMode === 'walk' ? (
        <PointerLockControls />
      ) : (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={cameraMode === 'top' ? 0.0001 : Math.PI / 2.02}
          minDistance={1}
          maxDistance={200}
        />
      )}
      <Walker enabled={cameraMode === 'walk'} floorBoundsRef={floorBoundsRef} />
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

      {design.floors.map((floor, i) => {
        const interactive = floor.id === activeFloorId
        // When isolation is on, skip rendering inactive floors entirely.
        if (isolate && !interactive) return null
        return (
          <group key={floor.id}>
            {interactive && <Rooms3D walls={floor.walls} elevation={elevations[i]} />}
            <Walls3D walls={floor.walls} openings={floor.openings} elevation={elevations[i]} interactive={interactive} />
            <Furniture3D furniture={floor.furniture} elevation={elevations[i]} interactive={interactive} />
          </group>
        )
      })}
    </>
  )
}

export function Scene3D() {
  const cameraMode = useDesignStore(s => s.cameraMode)
  const setCameraMode = useDesignStore(s => s.setCameraMode)
  const isolate = useDesignStore(s => s.isolateActiveFloor)
  const toggleFloorIsolation = useDesignStore(s => s.toggleFloorIsolation)
  // Capture a screenshot callback that SceneContent populates.
  const shotRef = useRef<() => void>(() => {})
  const onShotReady = useCallback((fn: () => void) => { shotRef.current = fn }, [])

  const modeBtn = (m: CameraMode, label: string, title: string) => (
    <button
      onClick={() => setCameraMode(m)}
      title={title}
      className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
        cameraMode === m ? 'bg-cyan-500 text-white' : 'bg-gray-800/85 text-gray-300 hover:bg-gray-700'
      }`}
    >{label}</button>
  )

  return (
    <div className="absolute inset-0 bg-[#aab2c0] light:bg-[#e2e8f0]">
      <Canvas shadows camera={{ position: [6, 6, 8], fov: 50 }} dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <SceneContent onShotReady={onShotReady} />
        </Suspense>
      </Canvas>

      {/* HUD: camera presets */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex rounded-lg overflow-hidden border border-gray-700/60 shadow-lg">
        {modeBtn('orbit', '🛰 Orbit', 'Orbit camera')}
        {modeBtn('walk',  '🚶 Walk',  'First-person walk-through (WASD + mouse)')}
        {modeBtn('top',   '⬇ Top',    'Top-down view')}
        {modeBtn('front', '▭ Front',  'Front elevation')}
        {modeBtn('iso',   '◆ Iso',    'Isometric view')}
      </div>

      {/* HUD right: floor isolation + PNG export */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
        <button
          onClick={toggleFloorIsolation}
          title="Show only the active floor in 3D"
          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
            isolate
              ? 'bg-cyan-500 text-white border-cyan-400'
              : 'bg-gray-800/85 text-gray-300 hover:bg-gray-700 border-gray-700'
          }`}
        >🏢 {isolate ? 'Active floor only' : 'All floors'}</button>
        <button
          onClick={() => shotRef.current()}
          title="Save current 3D view as PNG"
          className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-700 bg-gray-800/85 text-gray-300 hover:bg-gray-700 transition-colors"
        >📸 Export PNG</button>
      </div>

      {/* Bottom hint changes per mode */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-700 bg-white/60 px-2.5 py-0.5 rounded-full pointer-events-none">
        {cameraMode === 'walk'
          ? 'Click to lock pointer · WASD to walk · Shift to run · Esc to exit'
          : 'Left-drag orbit · Right-drag pan · Scroll zoom'}
      </div>
    </div>
  )
}

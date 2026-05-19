import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import { useDesignStore } from '../store/design'
import { Walls3D } from './Walls3D'
import { Furniture3D } from './Furniture3D'

function SceneContent() {
  const { design } = useDesignStore()

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 600, 800]} fov={45} near={1} far={10000} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={100}
        maxDistance={3000}
      />
      <Environment preset="city" />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[500, 800, 500]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-300, 400, -400]} intensity={0.3} />

      {/* Infinite floor grid */}
      <Grid
        args={[10000, 10000]}
        cellSize={20}
        cellThickness={0.5}
        cellColor="#2a2a3a"
        sectionSize={200}
        sectionThickness={1}
        sectionColor="#3a3a4a"
        fadeDistance={2000}
        fadeStrength={1}
        receiveShadow
      />

      <Walls3D walls={design.walls} />
      <Furniture3D furniture={design.furniture} />
    </>
  )
}

export function Scene3D() {
  return (
    <div className="flex-1 relative bg-[#0d0d1a]">
      <Canvas shadows>
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-700 pointer-events-none">
        Left-drag to orbit · Right-drag to pan · Scroll to zoom
      </div>
    </div>
  )
}

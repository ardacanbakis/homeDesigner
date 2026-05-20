import { Suspense, useMemo } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Furniture } from '../store/types'
import { CATALOG_MAP } from '../geometry/catalog'
import { useDesignStore } from '../store/design'
import { m } from './units'

const BASE = import.meta.env.BASE_URL

const MODEL_KINDS = [
  'bed', 'wardrobe', 'dresser', 'fridge', 'washer', 'stove', 'sink',
  'sofa', 'table', 'chair', 'toilet', 'bathtub', 'tv', 'desk', 'stairs',
] as const

// Start loading all models immediately
for (const kind of MODEL_KINDS) {
  useGLTF.preload(`${BASE}models/${kind}.gltf`)
}

type ModelKind = typeof MODEL_KINDS[number]

function GltfModel({ kind, w, h, d }: { kind: ModelKind; w: number; h: number; d: number }) {
  const { scene } = useGLTF(`${BASE}models/${kind}.gltf`)

  const { cloned, sizeX, sizeY, sizeZ, minY, centerX, centerZ } = useMemo(() => {
    const cloned = scene.clone(true)
    cloned.position.set(0, 0, 0)
    cloned.rotation.set(0, 0, 0)
    cloned.scale.set(1, 1, 1)
    cloned.updateWorldMatrix(true, true)
    cloned.traverse(node => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)
    return {
      cloned,
      sizeX: Math.max(size.x, 0.001),
      sizeY: Math.max(size.y, 0.001),
      sizeZ: Math.max(size.z, 0.001),
      minY: box.min.y,
      centerX: center.x,
      centerZ: center.z,
    }
  }, [scene])

  // Scale so model fits exactly in w×h×d, with base at y=0 and centered in X/Z
  const sx = w / sizeX
  const sy = h / sizeY
  const sz = d / sizeZ
  const tx = -centerX * sx
  const ty = -minY * sy
  const tz = -centerZ * sz

  return (
    <group position={[tx, ty, tz]} scale={[sx, sy, sz]}>
      <primitive object={cloned} />
    </group>
  )
}

function FallbackBox({ w, h, d, color }: { w: number; h: number; d: number; color: string }) {
  return (
    <mesh position={[0, h / 2, 0]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  )
}

function FurnitureItem({
  item, elevation, interactive,
}: {
  item: Furniture; elevation: number; interactive: boolean
}) {
  const { selectedId, setSelected } = useDesignStore()
  const isSelected = interactive && selectedId === item.id
  const cat = CATALOG_MAP[item.kind]
  const isCustom = item.kind === 'custom'

  const w = m(item.size.w)
  const d = m(item.size.d)
  const h = m(item.size.h)

  // Position: footprint top-left → center of footprint; base at floor elevation
  const x = m(item.position.x) + w / 2
  const z = m(item.position.y) + d / 2
  const y = m(elevation)

  const color = item.color ?? cat.color
  const displayLabel = isCustom ? (item.customLabel ?? 'Custom') : `${cat.icon} ${cat.label}`

  return (
    <group
      position={[x, y, z]}
      rotation={[0, -item.rotation, 0]}
      onClick={interactive ? (e => { e.stopPropagation(); setSelected(item.id) }) : undefined}
    >
      {isCustom ? (
        <FallbackBox w={w} h={h} d={d} color={color} />
      ) : (
        <Suspense fallback={<FallbackBox w={w} h={h} d={d} color={color} />}>
          <GltfModel kind={item.kind as ModelKind} w={w} h={h} d={d} />
        </Suspense>
      )}

      {/* Custom objects always show their label; catalog items show label only when selected */}
      {(isCustom || isSelected) && (
        <Html
          position={[0, h + 0.18, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap border ${
            isSelected
              ? 'bg-blue-900/80 text-blue-200 border-blue-600'
              : 'bg-gray-900/75 text-gray-200 border-gray-600'
          }`}>
            {displayLabel}
          </div>
        </Html>
      )}

      {isSelected && (
        <mesh position={[0, h / 2, 0]}>
          <boxGeometry args={[w + 0.04, h + 0.04, d + 0.04]} />
          <meshStandardMaterial color="#60a5fa" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}

export function Furniture3D({
  furniture, elevation, interactive = true,
}: {
  furniture: Furniture[]; elevation: number; interactive?: boolean
}) {
  return (
    <group>
      {furniture.map(f => (
        <FurnitureItem key={f.id} item={f} elevation={elevation} interactive={interactive} />
      ))}
    </group>
  )
}

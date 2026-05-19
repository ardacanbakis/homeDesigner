import { useRef } from 'react'
import { Html } from '@react-three/drei'
import type { Furniture } from '../store/types'
import { CATALOG_MAP } from '../geometry/catalog'
import { useDesignStore } from '../store/design'

function FurnitureItem({ item }: { item: Furniture }) {
  const { selectedId, setSelected } = useDesignStore()
  const isSelected = selectedId === item.id
  const cat = CATALOG_MAP[item.kind]

  // Scale cm → three units (divide by 10 for readability)
  const w = item.size.w / 10
  const d = item.size.d / 10
  const h = item.size.h / 10

  // Position: store x,y are floor plane; Three.js uses x,z
  const x = item.position.x / 10 + w / 2
  const z = item.position.y / 10 + d / 2
  const y = h / 2

  const color = item.color ?? cat.color

  // Different shapes for different furniture types
  const getShape = () => {
    switch (item.kind) {
      case 'chair':
        return (
          <>
            {/* Seat */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[w, h * 0.5, d]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            {/* Back */}
            <mesh position={[0, h * 0.25, -d * 0.4]} castShadow>
              <boxGeometry args={[w, h * 0.5, d * 0.1]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
          </>
        )
      case 'sofa':
        return (
          <>
            {/* Base */}
            <mesh position={[0, -h * 0.15, 0]} castShadow>
              <boxGeometry args={[w, h * 0.5, d]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            {/* Back */}
            <mesh position={[0, h * 0.1, -d * 0.35]} castShadow>
              <boxGeometry args={[w, h * 0.6, d * 0.2]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            {/* Armrests */}
            <mesh position={[w * 0.43, -h * 0.05, 0]} castShadow>
              <boxGeometry args={[w * 0.1, h * 0.55, d * 0.7]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            <mesh position={[-w * 0.43, -h * 0.05, 0]} castShadow>
              <boxGeometry args={[w * 0.1, h * 0.55, d * 0.7]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
          </>
        )
      case 'bed':
        return (
          <>
            {/* Mattress */}
            <mesh position={[0, -h * 0.1, 0]} castShadow>
              <boxGeometry args={[w * 0.95, h * 0.5, d * 0.8]} />
              <meshStandardMaterial color="#e8d5b7" roughness={0.9} />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, h * 0.1, -d * 0.44]} castShadow>
              <boxGeometry args={[w, h * 0.9, d * 0.08]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            {/* Frame */}
            <mesh position={[0, -h * 0.35, 0]} castShadow>
              <boxGeometry args={[w, h * 0.2, d]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
            {/* Pillow */}
            <mesh position={[0, h * 0.15, -d * 0.25]} castShadow>
              <boxGeometry args={[w * 0.7, h * 0.12, d * 0.15]} />
              <meshStandardMaterial color="#f5f5f5" roughness={1} />
            </mesh>
          </>
        )
      case 'fridge':
        return (
          <>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
            </mesh>
            {/* Handle */}
            <mesh position={[w * 0.42, h * 0.1, d * 0.52]} castShadow>
              <boxGeometry args={[w * 0.06, h * 0.3, d * 0.04]} />
              <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
            </mesh>
          </>
        )
      case 'toilet':
        return (
          <>
            {/* Bowl */}
            <mesh position={[0, -h * 0.1, d * 0.1]} castShadow>
              <cylinderGeometry args={[w * 0.45, w * 0.4, h * 0.5, 16]} />
              <meshStandardMaterial color={color} roughness={0.1} />
            </mesh>
            {/* Tank */}
            <mesh position={[0, h * 0.25, -d * 0.3]} castShadow>
              <boxGeometry args={[w * 0.7, h * 0.45, d * 0.25]} />
              <meshStandardMaterial color={color} roughness={0.1} />
            </mesh>
          </>
        )
      case 'bathtub':
        return (
          <>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={color} roughness={0.1} metalness={0.1} />
            </mesh>
            {/* Inner */}
            <mesh position={[0, h * 0.1, 0]} castShadow>
              <boxGeometry args={[w * 0.85, h * 0.4, d * 0.9]} />
              <meshStandardMaterial color="#d0e8f0" roughness={0.05} />
            </mesh>
          </>
        )
      case 'stove':
        return (
          <>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Burners */}
            {[-1, 1].map(xi => [-1, 1].map(zi => (
              <mesh key={`${xi}${zi}`} position={[xi * w * 0.22, h * 0.51, zi * d * 0.22]} castShadow>
                <cylinderGeometry args={[w * 0.12, w * 0.12, h * 0.04, 16]} />
                <meshStandardMaterial color="#222" roughness={0.5} />
              </mesh>
            )))}
          </>
        )
      case 'tv':
        return (
          <>
            {/* Screen */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[w, h * 0.85, d]} />
              <meshStandardMaterial color="#111" roughness={0.1} metalness={0.8} />
            </mesh>
            {/* Screen surface */}
            <mesh position={[0, 0, d * 0.52]}>
              <planeGeometry args={[w * 0.92, h * 0.78]} />
              <meshStandardMaterial color="#1a1a2e" roughness={0} metalness={0.9} />
            </mesh>
            {/* Stand */}
            <mesh position={[0, -h * 0.5, 0]}>
              <boxGeometry args={[w * 0.2, h * 0.15, d * 3]} />
              <meshStandardMaterial color="#333" roughness={0.3} />
            </mesh>
          </>
        )
      default:
        return (
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        )
    }
  }

  return (
    <group
      position={[x, y, z]}
      rotation={[0, -item.rotation, 0]}
      onClick={e => { e.stopPropagation(); setSelected(item.id) }}
    >
      {getShape()}
      {isSelected && (
        <>
          {/* Selection outline via slightly bigger wireframe */}
          <mesh>
            <boxGeometry args={[w + 0.3, h + 0.3, d + 0.3]} />
            <meshStandardMaterial color="#60a5fa" wireframe transparent opacity={0.4} />
          </mesh>
          <Html
            position={[0, h + 2, 0]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-blue-900/80 text-blue-200 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap border border-blue-600">
              {cat.icon} {cat.label}
            </div>
          </Html>
        </>
      )}
    </group>
  )
}

export function Furniture3D({ furniture }: { furniture: Furniture[] }) {
  return (
    <group>
      {furniture.map(f => (
        <FurnitureItem key={f.id} item={f} />
      ))}
    </group>
  )
}

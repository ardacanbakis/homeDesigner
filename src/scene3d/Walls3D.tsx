import { useMemo } from 'react'
import type { Wall } from '../store/types'
import { wallAngle, wallLength } from '../geometry/walls'

const WALL_COLOR = '#4a5568'
const WALL_SELECTED_COLOR = '#60a5fa'

type Props = { walls: Wall[]; selectedId?: string | null }

function WallMesh({ wall, isSelected }: { wall: Wall; isSelected: boolean }) {
  const len = wallLength(wall)
  const angle = wallAngle(wall)

  // Center of wall in 3D (Y-up, X-right, Z-depth)
  // Store uses x,y as floor plane; Three.js uses x,z as floor plane
  const cx = ((wall.a.x + wall.b.x) / 2) / 10  // divide by 10: cm → "three units" (1 unit = 1 cm effectively, but scaled)
  const cz = ((wall.a.y + wall.b.y) / 2) / 10
  const wallH = wall.height / 10
  const wallT = wall.thickness / 10
  const wallL = len / 10

  return (
    <mesh
      position={[cx, wallH / 2, cz]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[wallL, wallH, wallT]} />
      <meshStandardMaterial
        color={isSelected ? WALL_SELECTED_COLOR : WALL_COLOR}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  )
}

export function Walls3D({ walls, selectedId }: Props) {
  const wallList = useMemo(() => walls, [walls])

  return (
    <group>
      {wallList.map(w => (
        <WallMesh key={w.id} wall={w} isSelected={selectedId === w.id} />
      ))}
    </group>
  )
}

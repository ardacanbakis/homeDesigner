import type { Wall } from '../store/types'
import { wallAngle, wallLength } from '../geometry/walls'
import { m } from './units'
import { useDesignStore } from '../store/design'

const WALL_COLOR = '#cfd3da'
const WALL_SELECTED_COLOR = '#60a5fa'

function WallMesh({ wall, isSelected }: { wall: Wall; isSelected: boolean }) {
  const setSelected = useDesignStore(s => s.setSelected)
  const len = wallLength(wall)
  const angle = wallAngle(wall)

  // Store x,y -> Three x,z (floor plane). Y is up.
  const cx = m((wall.a.x + wall.b.x) / 2)
  const cz = m((wall.a.y + wall.b.y) / 2)
  const wallH = m(wall.height)
  const wallT = m(wall.thickness)
  const wallL = m(len)

  return (
    <mesh
      position={[cx, wallH / 2, cz]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
      onClick={e => {
        e.stopPropagation()
        setSelected(wall.id)
      }}
    >
      <boxGeometry args={[wallL, wallH, wallT]} />
      <meshStandardMaterial
        color={isSelected ? WALL_SELECTED_COLOR : WALL_COLOR}
        roughness={0.85}
        metalness={0}
      />
    </mesh>
  )
}

export function Walls3D({ walls }: { walls: Wall[] }) {
  const selectedId = useDesignStore(s => s.selectedId)
  return (
    <group>
      {walls.map(w => (
        <WallMesh key={w.id} wall={w} isSelected={selectedId === w.id} />
      ))}
    </group>
  )
}

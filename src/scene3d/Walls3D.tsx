import { useMemo } from 'react'
import * as THREE from 'three'
import type { Wall, Opening } from '../store/types'
import { wallAngle, wallLength } from '../geometry/walls'
import { m } from './units'
import { useDesignStore } from '../store/design'

const WALL_COLOR = '#d4d8e0'
const WALL_SELECTED = '#60a5fa'

function buildWallGeometry(len: number, height: number, thickness: number, openings: Opening[]): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-len / 2, -height / 2)
  shape.lineTo(len / 2, -height / 2)
  shape.lineTo(len / 2, height / 2)
  shape.lineTo(-len / 2, height / 2)
  shape.closePath()

  for (const op of openings) {
    const x0 = m(op.offset) - len / 2
    const x1 = x0 + m(op.width)
    const y0 = m(op.sillHeight) - height / 2
    const y1 = y0 + m(op.height)
    const hole = new THREE.Path()
    hole.moveTo(x0, y0)
    hole.lineTo(x1, y0)
    hole.lineTo(x1, y1)
    hole.lineTo(x0, y1)
    hole.closePath()
    shape.holes.push(hole)
  }

  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  geo.translate(0, 0, -thickness / 2)
  return geo
}

function WallMesh({
  wall, wallOpenings, elevation, isSelected, interactive,
}: {
  wall: Wall; wallOpenings: Opening[]; elevation: number; isSelected: boolean; interactive: boolean
}) {
  const setSelected = useDesignStore(s => s.setSelected)

  const len = m(wallLength(wall))
  const height = m(wall.height)
  const thickness = m(wall.thickness)
  const angle = wallAngle(wall)
  const cx = m((wall.a.x + wall.b.x) / 2)
  const cz = m((wall.a.y + wall.b.y) / 2)

  const geometry = useMemo(
    () => buildWallGeometry(len, height, thickness, wallOpenings),
    [len, height, thickness, wallOpenings]
  )

  return (
    <mesh
      position={[cx, m(elevation) + height / 2, cz]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
      onClick={interactive ? (e => { e.stopPropagation(); setSelected(wall.id) }) : undefined}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={isSelected ? WALL_SELECTED : WALL_COLOR}
        roughness={0.85}
        metalness={0}
        side={THREE.DoubleSide}
        transparent={!interactive}
        opacity={interactive ? 1 : 0.35}
      />
    </mesh>
  )
}

export function Walls3D({
  walls, openings, elevation, interactive = true,
}: {
  walls: Wall[]; openings: Opening[]; elevation: number; interactive?: boolean
}) {
  const selectedId = useDesignStore(s => s.selectedId)
  return (
    <group>
      {walls.map(w => (
        <WallMesh
          key={w.id}
          wall={w}
          wallOpenings={openings.filter(o => o.wallId === w.id)}
          elevation={elevation}
          isSelected={interactive && selectedId === w.id}
          interactive={interactive}
        />
      ))}
    </group>
  )
}

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { Wall, Opening } from '../store/types'
import { wallAngle, wallLength } from '../geometry/walls'
import { m } from './units'
import { useDesignStore } from '../store/design'

const WALL_COLOR = '#d4d8e0'
const WALL_SELECTED = '#60a5fa'
const FRAME = 0.05        // frame member width (m)
const LEAF_T = 0.04       // door leaf thickness (m)
const DOOR_OPEN = -1.15   // door leaf swing (rad) — shown ajar so rooms read as connected

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

/** Door (frame + swung leaf + handles) or window (frame + glass + mullions + sill),
 *  drawn in the wall's local space: x along the wall, y up, z through its thickness. */
function OpeningMesh({ op, len, height, thickness, opacity, selected, onSelect }: {
  op: Opening; len: number; height: number; thickness: number; opacity: number; selected: boolean
  onSelect?: (e: ThreeEvent<MouseEvent>) => void
}) {
  const x0 = m(op.offset) - len / 2
  const w = m(op.width)
  const h = m(op.height)
  const y0 = m(op.sillHeight) - height / 2
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const fd = thickness + 0.02 // frame stands slightly proud of both wall faces
  const fade = opacity < 1
  const frameColor = selected ? WALL_SELECTED : op.type === 'door' ? '#e7e1d6' : '#f5f3ee'
  const frame = <meshStandardMaterial color={frameColor} roughness={0.6} transparent={fade} opacity={opacity} />

  return (
    <group onClick={onSelect}>
      <mesh position={[x0 + FRAME / 2, cy, 0]} castShadow><boxGeometry args={[FRAME, h, fd]} />{frame}</mesh>
      <mesh position={[x0 + w - FRAME / 2, cy, 0]} castShadow><boxGeometry args={[FRAME, h, fd]} />{frame}</mesh>
      <mesh position={[cx, y0 + h - FRAME / 2, 0]} castShadow><boxGeometry args={[w, FRAME, fd]} />{frame}</mesh>

      {op.type === 'door' ? (() => {
        const leafW = Math.max(0.1, w - 2 * FRAME)
        const leafH = Math.max(0.1, h - FRAME)
        const handleY = Math.min(leafH / 2 - 0.1, 1.0 - leafH / 2) // ~1 m above the floor
        const metal = <meshStandardMaterial color="#c9c9c9" metalness={0.8} roughness={0.25} transparent={fade} opacity={opacity} />
        return (
          // Hinged on the inner edge of the left jamb.
          <group position={[x0 + FRAME, y0 + leafH / 2, 0]} rotation={[0, DOOR_OPEN, 0]}>
            <mesh position={[leafW / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[leafW, leafH, LEAF_T]} />
              <meshStandardMaterial color="#9a7350" roughness={0.55} transparent={fade} opacity={opacity} />
            </mesh>
            <mesh position={[leafW - 0.08, handleY, LEAF_T / 2 + 0.015]}><boxGeometry args={[0.11, 0.02, 0.03]} />{metal}</mesh>
            <mesh position={[leafW - 0.08, handleY, -LEAF_T / 2 - 0.015]}><boxGeometry args={[0.11, 0.02, 0.03]} />{metal}</mesh>
          </group>
        )
      })() : (() => {
        const gw = Math.max(0.05, w - 2 * FRAME)
        const gh = Math.max(0.05, h - 2 * FRAME)
        return (
          <>
            <mesh position={[cx, y0 + FRAME / 2, 0]} castShadow><boxGeometry args={[w, FRAME, fd]} />{frame}</mesh>
            <mesh position={[cx, cy, 0]}>
              <boxGeometry args={[gw, gh, 0.012]} />
              <meshStandardMaterial color="#bfe3f5" transparent opacity={0.28 * opacity} roughness={0.05} metalness={0.1} depthWrite={false} />
            </mesh>
            <mesh position={[cx, cy, 0]} castShadow><boxGeometry args={[0.03, gh, 0.03]} />{frame}</mesh>
            <mesh position={[cx, cy, 0]} castShadow><boxGeometry args={[gw, 0.03, 0.03]} />{frame}</mesh>
            {/* Outer sill projecting past both faces */}
            <mesh position={[cx, y0 - 0.015, 0]} castShadow receiveShadow><boxGeometry args={[w + 0.08, 0.03, thickness + 0.08]} />{frame}</mesh>
          </>
        )
      })()}
    </group>
  )
}

function WallMesh({
  wall, wallOpenings, elevation, selectedId, interactive,
}: {
  wall: Wall; wallOpenings: Opening[]; elevation: number; selectedId: string | null; interactive: boolean
}) {
  const setSelected = useDesignStore(s => s.setSelected)

  const len = m(wallLength(wall))
  const height = m(wall.height)
  const thickness = m(wall.thickness)
  const angle = wallAngle(wall)
  const cx = m((wall.a.x + wall.b.x) / 2)
  const cz = m((wall.a.y + wall.b.y) / 2)

  // Key the geometry on the opening dimensions, not the array identity — the
  // parent filters a fresh array every render, which used to rebuild (and leak)
  // every wall's geometry on any store change.
  const openingsKey = wallOpenings.map(o => `${o.offset},${o.width},${o.height},${o.sillHeight}`).join('|')
  const geometry = useMemo(
    () => buildWallGeometry(len, height, thickness, wallOpenings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [len, height, thickness, openingsKey],
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  const opacity = interactive ? 1 : 0.35

  return (
    <group position={[cx, m(elevation) + height / 2, cz]} rotation={[0, -angle, 0]}>
      <mesh
        castShadow
        receiveShadow
        onClick={interactive ? (e => { e.stopPropagation(); setSelected(wall.id) }) : undefined}
      >
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          color={interactive && selectedId === wall.id ? WALL_SELECTED : WALL_COLOR}
          roughness={0.85}
          metalness={0}
          side={THREE.DoubleSide}
          transparent={!interactive}
          opacity={opacity}
        />
      </mesh>
      {wallOpenings.map(op => (
        <OpeningMesh
          key={op.id}
          op={op}
          len={len}
          height={height}
          thickness={thickness}
          opacity={opacity}
          selected={interactive && selectedId === op.id}
          onSelect={interactive ? (e => { e.stopPropagation(); setSelected(op.id) }) : undefined}
        />
      ))}
    </group>
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
          selectedId={selectedId}
          interactive={interactive}
        />
      ))}
    </group>
  )
}

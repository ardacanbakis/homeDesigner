import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { Wall, Opening, RoomTag } from '../store/types'
import { wallAngle, wallLength } from '../geometry/walls'
import { deriveRooms, doorSwingSide } from '../geometry/rooms'
import { wallInsideSides, insideDistance, type WallSide } from '../geometry/cutaway'
import { wallPaintSpans, rectsAround, type PaintSpan } from '../geometry/paint'
import { m } from './units'
import { useDesignStore } from '../store/design'

const WALL_COLOR = '#d4d8e0'
const WALL_SELECTED = '#60a5fa'
const FRAME = 0.05        // frame member width (m)
const LEAF_T = 0.04       // door leaf thickness (m)
const DOOR_OPEN = 1.15    // door leaf swing (rad) — shown ajar so rooms read as connected

// Cutaway: each wall is clipped by a horizontal plane that eases between its
// full height and a low stub. Clipping (rather than rebuilding geometry) cuts
// the wall, its door and window frames and their shadows in one go.
const LOW_WALL = 0.3        // m — height a cut-away wall drops to
const CAP_COLOR = '#3b414c' // the cut face, drawn like the solid walls of a plan
const HYSTERESIS = 30       // cm — the camera must clear a wall's line by this much to flip it
const EASE = 9              // 1/s — how quickly walls drop and rise

/** 'auto' = cut away the walls between the camera and the rooms. */
export type WallMode = 'full' | 'low' | 'auto'

/** The cut face is the inside of the wall seen through the clipped top; it
 *  should never catch clicks meant for the wall itself. */
const noRaycast = () => null

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

const PAINT_GAP = 0.002 // m — paint sits just proud of the wall face

/** One mesh of vertex-coloured quads laid over the wall's painted faces, with
 *  holes for its doors and windows. Wall-local space, like buildWallGeometry. */
function buildPaintGeometry(len: number, height: number, thickness: number, openings: Opening[], spans: PaintSpan[]): THREE.BufferGeometry {
  const holes = openings.map(op => {
    const x0 = m(op.offset) - len / 2
    const y0 = m(op.sillHeight) - height / 2
    return { x0, x1: x0 + m(op.width), y0, y1: y0 + m(op.height) }
  })
  const pos: number[] = [], nrm: number[] = [], col: number[] = []
  const c = new THREE.Color()
  for (const sp of spans) {
    c.set(sp.color) // converted to the linear working space vertex colours use
    // Plan side +1 (the left-hand normal) is the wall's local −z face.
    const z = -sp.side * (thickness / 2 + PAINT_GAP)
    const nz = -sp.side
    for (const [x0, y0, x1, y1] of rectsAround(m(sp.from) - len / 2, m(sp.to) - len / 2, -height / 2, height / 2, holes)) {
      const quad = [[x0, y0], [x1, y0], [x1, y1], [x0, y0], [x1, y1], [x0, y1]]
      // Wind each triangle to face outwards from the wall.
      if (nz < 0) { quad.splice(1, 2, quad[2], quad[1]); quad.splice(4, 2, quad[5], quad[4]) }
      for (const [x, y] of quad) {
        pos.push(x, y, z)
        nrm.push(0, 0, nz)
        col.push(c.r, c.g, c.b)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return geo
}

/** Door (frame + swung leaf + handles) or window (frame + glass + mullions + sill),
 *  drawn in the wall's local space: x along the wall, y up, z through its thickness. */
function OpeningMesh({ op, len, height, thickness, opacity, selected, swing, planes, onSelect }: {
  op: Opening; len: number; height: number; thickness: number; opacity: number; selected: boolean
  /** Side the door opens into (see doorSwingSide), matching the 2D plan. */
  swing: 1 | -1
  /** The wall's cutaway plane. */
  planes: THREE.Plane[]
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
  const clip = { clippingPlanes: planes, clipShadows: true }
  const frame = <meshStandardMaterial color={frameColor} roughness={0.6} transparent={fade} opacity={opacity} {...clip} />

  return (
    <group onClick={onSelect}>
      <mesh position={[x0 + FRAME / 2, cy, 0]} castShadow><boxGeometry args={[FRAME, h, fd]} />{frame}</mesh>
      <mesh position={[x0 + w - FRAME / 2, cy, 0]} castShadow><boxGeometry args={[FRAME, h, fd]} />{frame}</mesh>
      <mesh position={[cx, y0 + h - FRAME / 2, 0]} castShadow><boxGeometry args={[w, FRAME, fd]} />{frame}</mesh>

      {op.type === 'door' ? (() => {
        const leafW = Math.max(0.1, w - 2 * FRAME)
        const leafH = Math.max(0.1, h - FRAME)
        const handleY = Math.min(leafH / 2 - 0.1, 1.0 - leafH / 2) // ~1 m above the floor
        const metal = <meshStandardMaterial color="#c9c9c9" metalness={0.8} roughness={0.25} transparent={fade} opacity={opacity} {...clip} />
        return (
          // Hinged on the inner edge of the start jamb. A positive Y rotation swings
          // the leaf toward local −z, which is the wall's left-hand normal in plan.
          <group position={[x0 + FRAME, y0 + leafH / 2, 0]} rotation={[0, swing * DOOR_OPEN, 0]}>
            <mesh position={[leafW / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[leafW, leafH, LEAF_T]} />
              <meshStandardMaterial color="#9a7350" roughness={0.55} transparent={fade} opacity={opacity} {...clip} />
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
              <meshStandardMaterial color="#bfe3f5" transparent opacity={0.28 * opacity} roughness={0.05} metalness={0.1} depthWrite={false} {...clip} />
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
  wall, wallOpenings, elevation, selectedId, interactive, swings, side, mode, paint,
}: {
  wall: Wall; wallOpenings: Opening[]; elevation: number; selectedId: string | null; interactive: boolean
  swings: Map<string, 1 | -1>
  side: WallSide
  mode: WallMode
  /** Painted stretches of this wall's faces (active floor only). */
  paint?: PaintSpan[]
}) {
  const setSelected = useDesignStore(s => s.setSelected)

  const len = m(wallLength(wall))
  const height = m(wall.height)
  const thickness = m(wall.thickness)
  const angle = wallAngle(wall)
  const cx = m((wall.a.x + wall.b.x) / 2)
  const cz = m((wall.a.y + wall.b.y) / 2)
  const base = m(elevation)

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

  const paintKey = paint?.map(p => `${p.side},${p.from},${p.to},${p.color}`).join('|') ?? ''
  const paintGeometry = useMemo(
    () => (paint?.length ? buildPaintGeometry(len, height, thickness, wallOpenings, paint) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [len, height, thickness, openingsKey, paintKey],
  )
  useEffect(() => () => paintGeometry?.dispose(), [paintGeometry])

  // Keeps everything at or below its constant (world y). Starts at full height
  // so walls ease down into the cutaway when the 3D view opens.
  const [plane] = useState(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), base + height + 0.05))
  const planes = useMemo(() => [plane], [plane])
  const anim = useRef({ cut: false, h: height + 0.05 })

  /* eslint-disable react-hooks/immutability -- the plane is three.js state, updated per frame */
  useFrame((state, dt) => {
    const a = anim.current
    if (mode === 'full') a.cut = false
    else if (mode === 'low') a.cut = true
    else {
      const cam = state.camera.position
      const d = insideDistance(wall, side, { x: cam.x * 100, y: cam.z * 100 })
      if (d < -HYSTERESIS) a.cut = true
      else if (d > HYSTERESIS) a.cut = false
    }
    const target = a.cut ? Math.min(LOW_WALL, height) : height + 0.05
    a.h += (target - a.h) * (1 - Math.exp(-Math.min(dt, 0.1) * EASE))
    if (Math.abs(target - a.h) < 1e-4) a.h = target
    plane.constant = base + a.h
  })
  /* eslint-enable react-hooks/immutability */

  // Clicks on the clipped-away part of a wall pass through to whatever is behind.
  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    if (e.point.y > plane.constant + 1e-3) return
    e.stopPropagation()
    setSelected(id)
  }

  const fade = !interactive
  const opacity = fade ? 0.35 : 1

  return (
    <group position={[cx, base + height / 2, cz]} rotation={[0, -angle, 0]}>
      <mesh castShadow receiveShadow onClick={interactive ? pick(wall.id) : undefined}>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          color={interactive && selectedId === wall.id ? WALL_SELECTED : WALL_COLOR}
          roughness={0.85}
          metalness={0}
          side={fade ? THREE.DoubleSide : THREE.FrontSide}
          transparent={fade}
          opacity={opacity}
          clippingPlanes={planes}
          clipShadows
        />
      </mesh>
      {/* Seen only through the clipped top: the wall's inside back faces, in a
          flat section colour, so a cut wall reads as solid. */}
      {!fade && (
        <mesh raycast={noRaycast}>
          <primitive object={geometry} attach="geometry" />
          <meshBasicMaterial color={CAP_COLOR} side={THREE.BackSide} clippingPlanes={planes} />
        </mesh>
      )}
      {paintGeometry && !fade && (
        <mesh raycast={noRaycast} receiveShadow>
          <primitive object={paintGeometry} attach="geometry" />
          <meshStandardMaterial
            vertexColors
            roughness={0.9}
            metalness={0}
            clippingPlanes={planes}
            clipShadows
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
      {wallOpenings.map(op => (
        <OpeningMesh
          key={op.id}
          op={op}
          len={len}
          height={height}
          thickness={thickness}
          opacity={opacity}
          selected={interactive && selectedId === op.id}
          swing={swings.get(op.id) ?? 1}
          planes={planes}
          onSelect={interactive ? pick(op.id) : undefined}
        />
      ))}
    </group>
  )
}

export function Walls3D({
  walls, openings, tags, elevation, interactive = true,
}: {
  walls: Wall[]; openings: Opening[]; tags?: RoomTag[]; elevation: number; interactive?: boolean
}) {
  const selectedId = useDesignStore(s => s.selectedId)
  const wallView = useDesignStore(s => s.wallView)
  const cameraMode = useDesignStore(s => s.cameraMode)
  const rooms = useMemo(() => deriveRooms(walls), [walls])
  // Door swing sides use the same rule as the 2D plan and the export.
  const swings = useMemo(() => {
    const out = new Map<string, 1 | -1>()
    for (const o of openings) {
      const w = walls.find(x => x.id === o.wallId)
      if (o.type === 'door' && w) out.set(o.id, doorSwingSide(w, o, walls, rooms))
    }
    return out
  }, [walls, openings, rooms])
  const sides = useMemo(() => wallInsideSides(walls, rooms), [walls, rooms])
  const paint = useMemo(() => wallPaintSpans(walls, rooms, tags), [walls, rooms, tags])
  // Walking around inside, you want real walls. Looking straight down nothing is
  // hidden, and full-height partitions show the room layout best.
  const mode: WallMode = cameraMode === 'walk' || wallView === 'full' ? 'full'
    : wallView === 'low' ? 'low'
    : cameraMode === 'top' ? 'full' : 'auto'
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
          swings={swings}
          side={sides.get(w.id) ?? 0}
          mode={mode}
          paint={paint.get(w.id)}
        />
      ))}
    </group>
  )
}

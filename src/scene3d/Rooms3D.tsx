import { useMemo } from 'react'
import * as THREE from 'three'
import type { Wall } from '../store/types'
import { deriveRooms, roomColor } from '../geometry/rooms'
import { m } from './units'

/** Translucent colored polygons on the floor for each derived room.
 *  Sits just above the ground plane to avoid z-fighting. */
export function Rooms3D({ walls, elevation }: { walls: Wall[]; elevation: number }) {
  const rooms = useMemo(() => deriveRooms(walls), [walls])

  if (rooms.length === 0) return null
  const y = m(elevation) + 0.005

  return (
    <group>
      {rooms.map(room => {
        const shape = new THREE.Shape(
          room.vertices.map(v => new THREE.Vector2(m(v.x), m(v.y))),
        )
        const geo = new THREE.ShapeGeometry(shape)
        // Lift onto the XZ plane (default ShapeGeometry is in XY).
        geo.rotateX(-Math.PI / 2)
        const color = new THREE.Color(roomColor(room.id))
        return (
          <mesh key={room.id} geometry={geo} position={[0, y, 0]} receiveShadow>
            <meshStandardMaterial color={color} transparent opacity={0.18} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

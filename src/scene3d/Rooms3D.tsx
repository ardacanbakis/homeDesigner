import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Wall } from '../store/types'
import { deriveRooms, roomColor } from '../geometry/rooms'
import { m } from './units'

/** Translucent colored polygons on the floor for each derived room.
 *  Sits just above the ground plane to avoid z-fighting. */
export function Rooms3D({ walls, elevation }: { walls: Wall[]; elevation: number }) {
  const meshes = useMemo(() => deriveRooms(walls).map(room => {
    const shape = new THREE.Shape(room.vertices.map(v => new THREE.Vector2(m(v.x), m(v.y))))
    const geometry = new THREE.ShapeGeometry(shape)
    // ShapeGeometry lives in XY; +π/2 about X maps plan y → +z, matching walls and furniture.
    geometry.rotateX(Math.PI / 2)
    return { id: room.id, geometry, color: new THREE.Color(roomColor(room.id)) }
  }), [walls])

  useEffect(() => () => meshes.forEach(r => r.geometry.dispose()), [meshes])

  if (meshes.length === 0) return null
  const y = m(elevation) + 0.005

  return (
    <group>
      {meshes.map(r => (
        <mesh key={r.id} geometry={r.geometry} position={[0, y, 0]} receiveShadow>
          {/* The +π/2 rotation leaves the face normal pointing down, so render both sides. */}
          <meshStandardMaterial color={r.color} transparent opacity={0.18} roughness={1} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

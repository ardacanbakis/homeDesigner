import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { RoomTag, Wall } from '../store/types'
import { deriveRooms, roomColor, tagForRoom } from '../geometry/rooms'
import { FLOOR_MATERIALS } from '../geometry/catalog'
import { floorTexture } from './floorTextures'
import { m } from './units'

/** Floor surfaces for each derived room: a real finish (wood, tile…) where the
 *  user picked one, otherwise a translucent tint on the active floor only.
 *  Sits just above the ground plane to avoid z-fighting. */
export function Rooms3D({ walls, tags, elevation, showTints }: {
  walls: Wall[]; tags: RoomTag[] | undefined; elevation: number; showTints: boolean
}) {
  const meshes = useMemo(() => {
    const rooms = deriveRooms(walls)
    return rooms.map(room => {
      const shape = new THREE.Shape(room.vertices.map(v => new THREE.Vector2(m(v.x), m(v.y))))
      // ShapeGeometry's UVs are the shape coordinates (metres), so finishes tile per metre.
      const geometry = new THREE.ShapeGeometry(shape)
      // ShapeGeometry lives in XY; +π/2 about X maps plan y → +z, matching walls and furniture.
      geometry.rotateX(Math.PI / 2)
      const material = tagForRoom(room, rooms, tags)?.material
      return { id: room.id, geometry, material, tint: new THREE.Color(roomColor(room.id)) }
    })
  }, [walls, tags])

  useEffect(() => () => meshes.forEach(r => r.geometry.dispose()), [meshes])

  if (meshes.length === 0) return null
  const y = m(elevation) + 0.005

  return (
    <group>
      {meshes.map(r => {
        // The +π/2 rotation leaves the face normal pointing down, so render both sides.
        if (r.material) {
          const map = floorTexture(r.material)
          const spec = FLOOR_MATERIALS[r.material]
          return (
            <mesh key={r.id} geometry={r.geometry} position={[0, y, 0]} receiveShadow>
              <meshStandardMaterial
                key={r.material}
                map={map}
                color={map ? '#ffffff' : spec.color}
                roughness={spec.roughness}
                side={THREE.DoubleSide}
              />
            </mesh>
          )
        }
        if (!showTints) return null
        return (
          <mesh key={r.id} geometry={r.geometry} position={[0, y, 0]} receiveShadow>
            <meshStandardMaterial color={r.tint} transparent opacity={0.18} roughness={1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}

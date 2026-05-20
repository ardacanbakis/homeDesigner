import type { Design } from '../store/types'

// Three.js world unit = 1 meter. Store works in centimeters.
export const CM_TO_M = 0.01

export function m(cm: number): number {
  return cm * CM_TO_M
}

export type Bounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  maxY: number
}

/** Bounding box across all floors (incl. floor elevations), in centimeters. Null if empty. */
export function designBounds(design: Design): Bounds | null {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxY = 0
  let has = false

  let elevation = 0
  for (const floor of design.floors) {
    for (const w of floor.walls) {
      has = true
      for (const p of [w.a, w.b]) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minZ = Math.min(minZ, p.y)
        maxZ = Math.max(maxZ, p.y)
      }
      maxY = Math.max(maxY, elevation + w.height)
    }
    for (const f of floor.furniture) {
      has = true
      minX = Math.min(minX, f.position.x)
      maxX = Math.max(maxX, f.position.x + f.size.w)
      minZ = Math.min(minZ, f.position.y)
      maxZ = Math.max(maxZ, f.position.y + f.size.d)
      maxY = Math.max(maxY, elevation + f.size.h)
    }
    elevation += floor.height
  }

  if (!has) return null
  return { minX, maxX, minZ, maxZ, maxY }
}

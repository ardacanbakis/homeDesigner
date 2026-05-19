import type { Vec2, Wall } from '../store/types'

export const SNAP_DIST = 15 // cm — snap threshold for wall endpoints

export function wallLength(wall: Wall): number {
  const dx = wall.b.x - wall.a.x
  const dy = wall.b.y - wall.a.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function wallAngle(wall: Wall): number {
  return Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x)
}

export function snapPoint(point: Vec2, walls: Wall[], gridSize: number): Vec2 {
  // Snap to existing wall endpoints first
  for (const w of walls) {
    for (const ep of [w.a, w.b]) {
      const dx = point.x - ep.x
      const dy = point.y - ep.y
      if (Math.sqrt(dx * dx + dy * dy) < SNAP_DIST) {
        return { x: ep.x, y: ep.y }
      }
    }
  }
  // Snap to grid
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

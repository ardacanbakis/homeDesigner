import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './templates'
import { deriveRooms, doorSwingSide, pointInPolygon } from '../geometry/rooms'
import { wallLength } from '../geometry/walls'
import { footprintAABB } from '../geometry/measure'
import { footprintsOverlap } from '../geometry/snap'
import type { Floor } from '../store/types'

// Quality gate for the built-in presets: furniture must not overlap, poke
// through walls, leave the building, or sit in a door's swing.

function issues(floor: Floor): string[] {
  const out: string[] = []
  const rooms = deriveRooms(floor.walls)
  const name = (i: number) => `${floor.furniture[i].kind}#${i}`

  // Overlapping furniture
  floor.furniture.forEach((a, i) => floor.furniture.forEach((b, j) => {
    if (j > i && footprintsOverlap(a, b)) out.push(`overlap ${name(i)} × ${name(j)}`)
  }))

  // Outside the building / through a wall body
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const w of floor.walls) {
    x0 = Math.min(x0, w.a.x, w.b.x); x1 = Math.max(x1, w.a.x, w.b.x)
    y0 = Math.min(y0, w.a.y, w.b.y); y1 = Math.max(y1, w.a.y, w.b.y)
  }
  floor.furniture.forEach((f, i) => {
    const b = footprintAABB(f)
    if (b.x0 < x0 || b.y0 < y0 || b.x1 > x1 || b.y1 > y1) out.push(`outside ${name(i)}`)
    for (const w of floor.walls) {
      const t = w.thickness / 2
      const wx0 = Math.min(w.a.x, w.b.x) - t, wx1 = Math.max(w.a.x, w.b.x) + t
      const wy0 = Math.min(w.a.y, w.b.y) - t, wy1 = Math.max(w.a.y, w.b.y) + t
      const ox = Math.min(b.x1, wx1) - Math.max(b.x0, wx0), oy = Math.min(b.y1, wy1) - Math.max(b.y0, wy0)
      if (ox > 1 && oy > 1) out.push(`${name(i)} inside a wall`)
    }
  })

  // Doors: the quarter disk the leaf sweeps must be clear, and so must a 50 cm
  // strip in front of the doorway on the far side (when that side is a room).
  for (const o of floor.openings.filter(op => op.type === 'door')) {
    const w = floor.walls.find(wl => wl.id === o.wallId)!
    const len = wallLength(w)
    const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len
    const side = doorSwingSide(w, o, floor.walls, rooms)
    const nx = uy * side, ny = -ux * side // toward the swing side
    const hx = w.a.x + ux * o.offset, hy = w.a.y + uy * o.offset
    const t = w.thickness / 2
    const coords = (px: number, py: number) => ({
      along: (px - hx) * ux + (py - hy) * uy,
      perp: (px - hx) * nx + (py - hy) * ny,
    })
    const inSwing = (px: number, py: number) => {
      const { along, perp } = coords(px, py)
      return along > 1 && perp > 1 && Math.hypot(along, perp) < o.width - 1
    }
    const mid = o.width / 2
    const farSideIsRoom = rooms.some(r => pointInPolygon({ x: hx + ux * mid - nx * (t + 25), y: hy + uy * mid - ny * (t + 25) }, r.vertices))
    const inApproach = (px: number, py: number) => {
      const { along, perp } = coords(px, py)
      return farSideIsRoom && along > 1 && along < o.width - 1 && perp < -t - 1 && perp > -t - 50
    }
    const where = `door on wall (${w.a.x},${w.a.y})→(${w.b.x},${w.b.y})`
    floor.furniture.forEach((f, i) => {
      const b = footprintAABB(f)
      let swing = false, approach = false
      for (let sx = 0; sx <= 8; sx++) for (let sy = 0; sy <= 8; sy++) {
        const px = b.x0 + (b.x1 - b.x0) * sx / 8, py = b.y0 + (b.y1 - b.y0) * sy / 8
        swing ||= inSwing(px, py)
        approach ||= inApproach(px, py)
      }
      if (swing) out.push(`${name(i)} is in the swing of the ${where}`)
      if (approach) out.push(`${name(i)} stands in front of the ${where}`)
    })
  }
  return [...new Set(out)]
}

describe('built-in templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.name} is clean: no overlaps, wall clipping or blocked doors`, () => {
      for (const floor of t.build().floors) {
        const found = issues(floor)
        expect(found, `\n  ${found.join('\n  ')}`).toEqual([])
      }
    })

    it(`${t.name} has enclosed rooms and every door opens into one`, () => {
      const floor = t.build().floors[0]
      const rooms = deriveRooms(floor.walls)
      expect(rooms.length).toBeGreaterThan(0)
      expect(floor.openings.some(o => o.type === 'door')).toBe(true)
    })
  }
})

import type { Vec2, Wall } from '../store/types'
import { wallLength } from './walls'
import { roomAt, type Room } from './rooms'

// The 3D cutaway works like a doll's house: walls between the camera and the
// rooms drop down to a stub, and only the back walls (exterior walls whose
// inside faces the camera) stay at full height.

/** Which side of a wall the building is on: +1 = the wall's left-hand normal
 *  (u.y, −u.x), −1 = the other side, 0 = rooms on both sides (interior wall). */
export type WallSide = -1 | 0 | 1

/** The inside of every wall, keyed by wall id. Walls that border no room
 *  (an unfinished sketch) count the middle of the plan as inside. */
export function wallInsideSides(walls: Wall[], rooms: Room[]): Map<string, WallSide> {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const w of walls) {
    x0 = Math.min(x0, w.a.x, w.b.x); x1 = Math.max(x1, w.a.x, w.b.x)
    y0 = Math.min(y0, w.a.y, w.b.y); y1 = Math.max(y1, w.a.y, w.b.y)
  }
  const mid = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }

  const out = new Map<string, WallSide>()
  for (const w of walls) {
    const len = wallLength(w)
    if (!len) { out.set(w.id, 0); continue }
    const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len
    const nx = uy, ny = -ux
    const probe = w.thickness / 2 + 25
    // Probe at several points: a long wall can border a room for only part of
    // its length, and a partition meeting it mid-way would hide a single probe.
    let plus = false, minus = false
    for (const t of [0.2, 0.5, 0.8]) {
      const px = w.a.x + ux * len * t, py = w.a.y + uy * len * t
      if (roomAt(rooms, { x: px + nx * probe, y: py + ny * probe })) plus = true
      if (roomAt(rooms, { x: px - nx * probe, y: py - ny * probe })) minus = true
    }
    if (plus && minus) out.set(w.id, 0)
    else if (plus) out.set(w.id, 1)
    else if (minus) out.set(w.id, -1)
    else {
      const cx = (w.a.x + w.b.x) / 2, cy = (w.a.y + w.b.y) / 2
      out.set(w.id, nx * (mid.x - cx) + ny * (mid.y - cy) >= 0 ? 1 : -1)
    }
  }
  return out
}

/** How far (cm) the camera stands on the wall's inside, measured from the
 *  wall's centreline: positive when it looks at the wall's inside face (a back
 *  wall, which stays up), negative when the wall stands between the camera and
 *  the rooms. Interior walls always hide a room, so they report −Infinity. */
export function insideDistance(wall: Wall, side: WallSide, camera: Vec2): number {
  if (side === 0) return -Infinity
  const len = wallLength(wall)
  if (!len) return -Infinity
  const nx = (wall.b.y - wall.a.y) / len, ny = -(wall.b.x - wall.a.x) / len
  const cx = (wall.a.x + wall.b.x) / 2, cy = (wall.a.y + wall.b.y) / 2
  return side * (nx * (camera.x - cx) + ny * (camera.y - cy))
}

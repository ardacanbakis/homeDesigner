import type { RoomTag, Wall } from '../store/types'
import { wallLength } from './walls'
import { roomAt, tagForRoom, type Room } from './rooms'

/** A stretch of one face of a wall painted in a room's colour. `side` is +1 for
 *  the face on the wall's left-hand normal (u.y, −u.x), −1 for the other face;
 *  `from` and `to` are distances along the wall from `a`, in cm. */
export type PaintSpan = { side: 1 | -1; from: number; to: number; color: string }

const TOL = 0.6 // cm, matching the room graph's junction tolerance

/** Where each wall's faces take a room's paint colour, keyed by wall id.
 *  A wall can border several rooms on one face (a partition meeting it
 *  mid-way), so each face is split at the junctions along it and every piece
 *  takes the colour of the room in front of it. */
export function wallPaintSpans(walls: Wall[], rooms: Room[], tags: RoomTag[] | undefined): Map<string, PaintSpan[]> {
  const out = new Map<string, PaintSpan[]>()
  if (!tags?.some(t => t.paint)) return out

  const paintOf = new Map<string, string | undefined>()
  const colorAt = (x: number, y: number): string | undefined => {
    const room = roomAt(rooms, { x, y })
    if (!room) return undefined
    if (!paintOf.has(room.id)) paintOf.set(room.id, tagForRoom(room, rooms, tags)?.paint)
    return paintOf.get(room.id)
  }

  for (const w of walls) {
    const len = wallLength(w)
    if (!len) continue
    const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len
    const nx = uy, ny = -ux

    // Junctions along the wall: other walls' endpoints that touch its interior.
    const cuts = [0, len]
    for (const o of walls) {
      if (o === w) continue
      for (const p of [o.a, o.b]) {
        const t = (p.x - w.a.x) * ux + (p.y - w.a.y) * uy
        const off = Math.abs((p.x - w.a.x) * nx + (p.y - w.a.y) * ny)
        if (off < TOL && t > TOL && t < len - TOL) cuts.push(t)
      }
    }
    cuts.sort((p, q) => p - q)

    const spans: PaintSpan[] = []
    const probe = w.thickness / 2 + 20
    for (const side of [1, -1] as const) {
      for (let i = 0; i + 1 < cuts.length; i++) {
        const from = cuts[i], to = cuts[i + 1]
        if (to - from < TOL) continue
        const t = (from + to) / 2
        const color = colorAt(w.a.x + ux * t + nx * probe * side, w.a.y + uy * t + ny * probe * side)
        if (!color) continue
        const last = spans[spans.length - 1]
        // Pieces of the same colour on the same face join up.
        if (last && last.side === side && last.color === color && Math.abs(last.to - from) < TOL) last.to = to
        else spans.push({ side, from, to, color })
      }
    }
    if (spans.length) out.set(w.id, spans)
  }
  return out
}

/** Rectangles (x0, y0, x1, y1) covering [x0, x1] × [y0, y1] minus the holes.
 *  Used to lay paint over a wall face around its doors and windows. */
export function rectsAround(
  x0: number, x1: number, y0: number, y1: number,
  holes: { x0: number; x1: number; y0: number; y1: number }[],
): [number, number, number, number][] {
  const eps = 1e-6
  const xs = new Set([x0, x1])
  for (const h of holes) {
    if (h.x0 > x0 && h.x0 < x1) xs.add(h.x0)
    if (h.x1 > x0 && h.x1 < x1) xs.add(h.x1)
  }
  const sorted = [...xs].sort((p, q) => p - q)
  const out: [number, number, number, number][] = []
  for (let i = 0; i + 1 < sorted.length; i++) {
    const xa = sorted[i], xb = sorted[i + 1]
    if (xb - xa < eps) continue
    // Holes spanning this whole column, as vertical gaps.
    const gaps = holes
      .filter(h => h.x0 <= xa + eps && h.x1 >= xb - eps && h.y1 > y0 && h.y0 < y1)
      .map(h => [Math.max(y0, h.y0), Math.min(y1, h.y1)] as const)
      .sort((p, q) => p[0] - q[0])
    let y = y0
    for (const [g0, g1] of gaps) {
      if (g0 > y + eps) out.push([xa, y, xb, g0])
      y = Math.max(y, g1)
    }
    if (y1 > y + eps) out.push([xa, y, xb, y1])
  }
  return out
}

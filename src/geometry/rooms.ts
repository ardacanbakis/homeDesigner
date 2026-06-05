import type { Vec2, Wall, Furniture, FurnitureKind } from '../store/types'

/** A derived room: a closed polygon traced from wall loops. */
export type Room = {
  /** Stable id derived from the sorted vertex coordinates. */
  id: string
  vertices: Vec2[]
  /** Signed polygon area in cm². Always reported as positive. */
  area: number
  /** Geometric centroid (cm). */
  centroid: Vec2
}

const POINT_PRECISION = 0.5 // cm — round endpoints when keying the graph

function key(p: Vec2): string {
  return `${Math.round(p.x / POINT_PRECISION)},${Math.round(p.y / POINT_PRECISION)}`
}

/** Planar-face room derivation:
 *  - build an undirected graph from wall endpoints
 *  - for each directed half-edge, repeatedly pick the next edge with the
 *    smallest counterclockwise turn → that traces one face
 *  - the unbounded outer face is the one with negative signed area (ccw)
 *  - all bounded faces are rooms. */
export function deriveRooms(walls: Wall[]): Room[] {
  if (walls.length < 3) return []

  // ── Build vertices + adjacency ─────────────────────────────────────────────
  const vertMap = new Map<string, Vec2>()
  const adj = new Map<string, string[]>()
  const addVert = (p: Vec2): string => {
    const k = key(p)
    if (!vertMap.has(k)) {
      vertMap.set(k, p)
      adj.set(k, [])
    }
    return k
  }
  for (const w of walls) {
    const ka = addVert(w.a)
    const kb = addVert(w.b)
    if (ka === kb) continue
    if (!adj.get(ka)!.includes(kb)) adj.get(ka)!.push(kb)
    if (!adj.get(kb)!.includes(ka)) adj.get(kb)!.push(ka)
  }

  // ── Trace faces ────────────────────────────────────────────────────────────
  const visited = new Set<string>() // edge-id "from->to"
  const edgeId = (a: string, b: string) => `${a}->${b}`
  const angle = (from: string, to: string) => {
    const a = vertMap.get(from)!
    const b = vertMap.get(to)!
    return Math.atan2(b.y - a.y, b.x - a.x)
  }
  /** Pick the next CCW edge from `to`, coming in along `from→to`.
   *  We want the most CCW turn from the reverse-incoming direction. */
  const nextEdge = (from: string, to: string): string | null => {
    const incomingAngle = angle(to, from) // direction at `to` pointing back to `from`
    const neighbors = adj.get(to)!.filter(n => n !== from)
    if (neighbors.length === 0) return null
    // Pick the neighbor whose outgoing angle is the most clockwise from `incomingAngle`
    // (smallest positive turn). That traces a face on the left side.
    let best: string | null = null
    let bestDelta = Infinity
    for (const n of neighbors) {
      let delta = angle(to, n) - incomingAngle
      while (delta <= 0) delta += Math.PI * 2
      while (delta > Math.PI * 2) delta -= Math.PI * 2
      if (delta < bestDelta) { bestDelta = delta; best = n }
    }
    return best
  }

  const faces: Vec2[][] = []
  for (const [startKey, neighbors] of adj.entries()) {
    for (const n of neighbors) {
      const eid = edgeId(startKey, n)
      if (visited.has(eid)) continue
      const face: string[] = [startKey]
      let cur = n
      let prev = startKey
      visited.add(eid)
      let safety = walls.length * 2 + 10
      while (cur !== startKey && safety-- > 0) {
        face.push(cur)
        const nxt = nextEdge(prev, cur)
        if (!nxt) { face.length = 0; break }
        visited.add(edgeId(cur, nxt))
        prev = cur
        cur = nxt
      }
      if (face.length >= 3) faces.push(face.map(k => vertMap.get(k)!))
    }
  }

  // ── Filter to interior faces, dedupe ───────────────────────────────────────
  const rooms: Room[] = []
  const seen = new Set<string>()
  for (const verts of faces) {
    const signed = signedArea(verts)
    if (signed >= 0) continue // skip outer (ccw) face / collinear
    const area = Math.abs(signed)
    if (area < 100) continue // ignore degenerate slivers (<100 cm² = 0.01 m²)
    // Stable id from sorted vertices
    const id = verts.map(v => key(v)).sort().join('|')
    if (seen.has(id)) continue
    seen.add(id)
    rooms.push({ id, vertices: verts, area, centroid: centroid(verts) })
  }
  return rooms
}

function signedArea(verts: Vec2[]): number {
  let s = 0
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % verts.length]
    s += (a.x * b.y - b.x * a.y)
  }
  return s / 2
}

function centroid(verts: Vec2[]): Vec2 {
  // Weighted by signed sub-triangle area for proper polygon centroid.
  let cx = 0, cy = 0, a = 0
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i]
    const q = verts[(i + 1) % verts.length]
    const cross = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
    a += cross
  }
  if (a === 0) {
    // Degenerate — fall back to average.
    return {
      x: verts.reduce((s, v) => s + v.x, 0) / verts.length,
      y: verts.reduce((s, v) => s + v.y, 0) / verts.length,
    }
  }
  a *= 0.5
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

/** Even-odd point-in-polygon test. */
export function pointInPolygon(p: Vec2, verts: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y
    const xj = verts[j].x, yj = verts[j].y
    const intersects = ((yi > p.y) !== (yj > p.y))
      && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

/** Heuristic room label based on the furniture inside it. */
const KIND_WEIGHT: Partial<Record<FurnitureKind, { label: string; weight: number }>> = {
  bed:      { label: 'Bedroom',  weight: 6 },
  wardrobe: { label: 'Bedroom',  weight: 3 },
  dresser:  { label: 'Bedroom',  weight: 2 },
  toilet:   { label: 'Bathroom', weight: 6 },
  bathtub:  { label: 'Bathroom', weight: 6 },
  sink:     { label: 'Kitchen',  weight: 2 }, // sink in a bathroom is overridden by toilet/tub
  fridge:   { label: 'Kitchen',  weight: 5 },
  stove:    { label: 'Kitchen',  weight: 5 },
  sofa:     { label: 'Living',   weight: 5 },
  tv:       { label: 'Living',   weight: 4 },
  desk:     { label: 'Office',   weight: 5 },
  table:    { label: 'Dining',   weight: 2 },
}

export function classifyRoom(room: Room, furniture: Furniture[]): string {
  const inside = furniture.filter(f => {
    const cx = f.position.x + f.size.w / 2
    const cy = f.position.y + f.size.d / 2
    return pointInPolygon({ x: cx, y: cy }, room.vertices)
  })
  if (inside.length === 0) return 'Room'
  const scores = new Map<string, number>()
  for (const f of inside) {
    const e = KIND_WEIGHT[f.kind]
    if (!e) continue
    scores.set(e.label, (scores.get(e.label) ?? 0) + e.weight)
  }
  if (scores.size === 0) return 'Room'
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0][0]
}

/** Deterministic, gentle fill color from the room id. */
export function roomColor(id: string): string {
  // Hash the id → hue, fixed saturation/lightness for a calm pastel palette.
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 55% 50%)`
}

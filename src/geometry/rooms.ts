import type { Vec2, Wall, Opening, Furniture, FurnitureKind } from '../store/types'
import { footprintAABB } from './measure'
import { wallLength } from './walls'

/** Axis-aligned box in cm. */
export type Box = { x0: number; y0: number; x1: number; y1: number }

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

type Segment = { a: Vec2; b: Vec2 }

/** Distance from a point to a finite segment, in cm. */
function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): { dist: number; t: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-9) return { dist: Math.hypot(p.x - a.x, p.y - a.y), t: 0 }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const px = a.x + t * dx
  const py = a.y + t * dy
  return { dist: Math.hypot(p.x - px, p.y - py), t }
}

/** Split each wall at every other wall's endpoint that lies on its interior. */
function subdivideAtJunctions(walls: Wall[]): Segment[] {
  const TOL = 0.6 // cm — slightly above POINT_PRECISION to absorb keying drift
  // Collect a deduped list of all endpoints.
  const endpoints: Vec2[] = []
  const seen = new Set<string>()
  for (const w of walls) {
    for (const p of [w.a, w.b]) {
      const k = key(p)
      if (!seen.has(k)) { seen.add(k); endpoints.push(p) }
    }
  }

  const segments: Segment[] = []
  for (const w of walls) {
    // Find every endpoint that lies on the wall's interior (excluding its own endpoints).
    const splits: { t: number; p: Vec2 }[] = []
    for (const p of endpoints) {
      if (key(p) === key(w.a) || key(p) === key(w.b)) continue
      const { dist, t } = pointSegmentDistance(p, w.a, w.b)
      if (dist < TOL && t > 0 && t < 1) splits.push({ t, p })
    }
    splits.sort((x, y) => x.t - y.t)
    let prev = w.a
    for (const s of splits) {
      segments.push({ a: prev, b: s.p })
      prev = s.p
    }
    segments.push({ a: prev, b: w.b })
  }
  return segments
}

/** Planar-face room derivation:
 *  - build an undirected graph from wall endpoints
 *  - for each directed half-edge, repeatedly pick the next edge with the
 *    smallest counterclockwise turn → that traces one face
 *  - the unbounded outer face is the one with negative signed area (ccw)
 *  - all bounded faces are rooms. */
export function deriveRooms(walls: Wall[]): Room[] {
  if (walls.length < 3) return []

  // ── Subdivide walls at T-junctions ─────────────────────────────────────────
  // A wall that ends *on* another wall (touching its interior, not its endpoint)
  // creates a T-junction. Without splitting the host wall at that point, the
  // adjacency graph is disconnected at the junction and room derivation misses
  // rooms separated by such partitions.
  const subdivided = subdivideAtJunctions(walls)

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
  for (const seg of subdivided) {
    const ka = addVert(seg.a)
    const kb = addVert(seg.b)
    if (ka === kb) continue
    if (!adj.get(ka)!.includes(kb)) adj.get(ka)!.push(kb)
    if (!adj.get(kb)!.includes(ka)) adj.get(kb)!.push(ka)
  }

  // ── Prune dangling walls ────────────────────────────────────────────────────
  // A wall with a free end (degree-1 vertex) can't be part of any room loop;
  // iteratively stripping such edges keeps stray/partial partitions from
  // producing phantom faces (common while a user is mid-draw).
  let pruned = true
  while (pruned) {
    pruned = false
    for (const [k, ns] of adj) {
      if (ns.length === 1) {
        const other = ns[0]
        adj.set(k, [])
        adj.set(other, adj.get(other)!.filter(x => x !== k))
        pruned = true
      }
    }
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

/** Rule-based room label from the furniture whose centre falls inside the room.
 *  Recognises open-plan combinations (studio, living + kitchen, kitchen-diner)
 *  rather than naively picking the single highest-weight item. */
export function classifyRoom(room: Room, furniture: Furniture[]): string {
  const inside = furniture.filter(f =>
    pointInPolygon({ x: f.position.x + f.size.w / 2, y: f.position.y + f.size.d / 2 }, room.vertices),
  )
  if (inside.length === 0) return 'Room'

  const count = (k: FurnitureKind) => inside.filter(f => f.kind === k).length
  const has = (k: FurnitureKind) => count(k) > 0

  const bath = has('toilet') || has('bathtub')
  const bed = has('bed')
  const kitchen = has('fridge') || has('stove')
  const living = has('sofa') || has('tv')
  const deskCount = count('desk')
  const table = has('table')
  const chairs = count('chair')

  if (bath && !bed && !living && deskCount === 0) return 'Bathroom'
  if (bed && kitchen) return 'Studio'
  if (bed) return 'Bedroom'
  if (deskCount >= 2) return 'Office'
  if (kitchen && living) return 'Living + Kitchen'
  if (kitchen && table) return 'Kitchen-Diner'
  if (kitchen) return 'Kitchen'
  if (deskCount === 1) return 'Office'
  if (living) return 'Living'
  // A table ringed by chairs reads as a meeting room when the floor is an office.
  if (table && chairs >= 2 && furniture.filter(f => f.kind === 'desk').length >= 2) return 'Meeting'
  if (table && chairs >= 2) return 'Dining'
  if (table) return 'Dining'
  if (bath) return 'Bathroom'
  return 'Room'
}

/** Where to put a w×h (cm) room label: a point whose label box sits fully inside
 *  the room and overlaps furniture as little as possible, preferring spots near
 *  the centroid. Falls back to the centroid when the room is too small. */
export function roomLabelPoint(room: Room, furniture: Furniture[], w: number, h: number, obstacles: Box[] = []): Vec2 {
  const xs = room.vertices.map(v => v.x), ys = room.vertices.map(v => v.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const step = Math.max(6, Math.min(x1 - x0, y1 - y0) / 14)
  const boxes = [...furniture.map(footprintAABB), ...obstacles]
  const inRoom = (x: number, y: number) => pointInPolygon({ x, y }, room.vertices)
  const { centroid: c } = room
  let best = c, bestScore = Infinity
  for (let y = y0 + h / 2; y <= y1 - h / 2 + 1e-6; y += step) {
    for (let x = x0 + w / 2; x <= x1 - w / 2 + 1e-6; x += step) {
      const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2
      const m = 10 // keep clear of the wall's inner face (room polygons follow wall centrelines)
      if (!inRoom(x, y) || !inRoom(l - m, t - m) || !inRoom(r + m, t - m) || !inRoom(l - m, b + m) || !inRoom(r + m, b + m)) continue
      let overlap = 0
      for (const f of boxes) {
        const ox = Math.min(r, f.x1) - Math.max(l, f.x0)
        const oy = Math.min(b, f.y1) - Math.max(t, f.y0)
        if (ox > 0 && oy > 0) overlap += ox * oy
      }
      // Any overlap outweighs distance, so a clear spot always wins.
      const score = overlap * 10 + Math.hypot(x - c.x, y - c.y)
      if (score < bestScore) { bestScore = score; best = { x, y } }
    }
  }
  return best
}

/** Which side a door swings to: +1 = the wall's left-hand normal (u.y, −u.x),
 *  −1 = the other side. An interior door swings into the smaller of the two
 *  rooms it connects (into the bedroom or bathroom, not the living room); an
 *  exterior door swings into the building. Shared by the 2D editor, the 3D view
 *  and the plan export so all three agree. */
export function doorSwingSide(wall: Wall, opening: Opening, walls: Wall[], rooms: Room[]): 1 | -1 {
  const len = wallLength(wall)
  if (len === 0) return 1
  const ux = (wall.b.x - wall.a.x) / len, uy = (wall.b.y - wall.a.y) / len
  const nx = uy, ny = -ux
  const s = opening.offset + opening.width / 2
  const mx = wall.a.x + ux * s, my = wall.a.y + uy * s
  const probe = wall.thickness / 2 + 30
  const roomAt = (x: number, y: number) =>
    rooms.filter(r => pointInPolygon({ x, y }, r.vertices)).sort((p, q) => p.area - q.area)[0]
  const plus = roomAt(mx + nx * probe, my + ny * probe)
  const minus = roomAt(mx - nx * probe, my - ny * probe)
  if (plus && minus) return plus.area <= minus.area ? 1 : -1
  if (plus) return 1
  if (minus) return -1

  // No enclosed rooms yet (open plan / mid-draw): swing toward the floor's middle.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const w of walls) {
    x0 = Math.min(x0, w.a.x, w.b.x); x1 = Math.max(x1, w.a.x, w.b.x)
    y0 = Math.min(y0, w.a.y, w.b.y); y1 = Math.max(y1, w.a.y, w.b.y)
  }
  return nx * ((x0 + x1) / 2 - mx) + ny * ((y0 + y1) / 2 - my) < 0 ? -1 : 1
}

/** Axis-aligned box covering each door's swing (leaf + arc), for keeping labels clear. */
export function doorSwingBoxes(walls: Wall[], openings: Opening[], rooms: Room[]): Box[] {
  const out: Box[] = []
  for (const o of openings) {
    if (o.type !== 'door') continue
    const w = walls.find(x => x.id === o.wallId)
    const len = w ? wallLength(w) : 0
    if (!w || !len) continue
    const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len
    const side = doorSwingSide(w, o, walls, rooms)
    const nx = uy * side * o.width, ny = -ux * side * o.width
    const hx = w.a.x + ux * o.offset, hy = w.a.y + uy * o.offset
    const jx = hx + ux * o.width, jy = hy + uy * o.width
    const xs = [hx, jx, hx + nx, jx + nx], ys = [hy, jy, hy + ny, jy + ny]
    out.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) })
  }
  return out
}

/** Deterministic hue (0–359) from the room id. */
export function roomHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

/** Deterministic, gentle fill color from the room id. */
export function roomColor(id: string): string {
  // Fixed saturation/lightness for a calm pastel palette.
  return `hsl(${roomHue(id)} 55% 50%)`
}

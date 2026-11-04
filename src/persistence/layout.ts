import { nanoid } from 'nanoid'
import type { Design, Floor, Wall, Opening, Furniture, FurnitureKind } from '../store/types'
import { CURRENT_VERSION } from './storage'
import { CATALOG_MAP } from '../geometry/catalog'

// A declarative floor-plan builder. Furniture is anchored to walls with real
// clearances so pieces hug walls and never float in the middle of a room.
//
// Orientation: every model has its back (headboard, sofa back, appliance rear)
// at −z, so with the app's 3D rotation [0, −rotation, 0] a piece at rotation 0
// has its back to the north. Pieces placed against a wall are turned so their
// back is against that wall and they face into the room. Sizes are always the
// natural catalog sizes — w across the front, d front-to-back — never swapped.

export type Side = 'N' | 'S' | 'E' | 'W'
/** Wall-centerline rectangle of a room, in cm. */
export type Box = { x0: number; y0: number; x1: number; y1: number }

export const WALL_GAP = 14 // default clearance from a wall (cm)

/** Rotation (radians) that puts a piece's back against the given wall. */
export const BACK_TO: Record<Side, number> = { N: 0, S: Math.PI, W: -Math.PI / 2, E: Math.PI / 2 }

type PlaceOpts = {
  w?: number; d?: number; h?: number
  /** 0..1 position along the wall (0 = start corner, 1 = end corner, 0.5 = centered). */
  align?: number
  /** Clearance from the anchored wall (cm). */
  gap?: number
  color?: string
}

export class Plan {
  walls: Wall[] = []
  openings: Opening[] = []
  furniture: Furniture[] = []

  wall(ax: number, ay: number, bx: number, by: number, thickness = 15, height = 270): Wall {
    const w: Wall = { id: nanoid(), a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness, height }
    this.walls.push(w)
    return w
  }

  /** Outer rectangle → 4 walls (n,e,s,w). */
  rect(x0: number, y0: number, x1: number, y1: number) {
    return {
      n: this.wall(x0, y0, x1, y0),
      e: this.wall(x1, y0, x1, y1),
      s: this.wall(x1, y1, x0, y1),
      w: this.wall(x0, y1, x0, y0),
    }
  }

  partition(ax: number, ay: number, bx: number, by: number): Wall {
    return this.wall(ax, ay, bx, by)
  }

  /** Door centred on world coordinate `at` — x for a horizontal wall, y for a
   *  vertical one — so placement never depends on which way the wall was drawn. */
  door(wall: Wall, at: number, width = 90, height = 210) {
    this.openings.push({ id: nanoid(), wallId: wall.id, type: 'door', offset: this.offsetFor(wall, at, width), width, height, sillHeight: 0 })
  }
  window(wall: Wall, at: number, width = 120, height = 130, sill = 90) {
    this.openings.push({ id: nanoid(), wallId: wall.id, type: 'window', offset: this.offsetFor(wall, at, width), width, height, sillHeight: sill })
  }
  private offsetFor(wall: Wall, at: number, width: number) {
    const horizontal = Math.abs(wall.b.x - wall.a.x) >= Math.abs(wall.b.y - wall.a.y)
    const along = horizontal ? Math.abs(at - wall.a.x) : Math.abs(at - wall.a.y)
    const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y)
    return Math.max(4, Math.min(len - width - 4, along - width / 2))
  }

  private resolve(kind: FurnitureKind, o: PlaceOpts) {
    const c = CATALOG_MAP[kind]
    return { w: o.w ?? c.size.w, d: o.d ?? c.size.d, h: o.h ?? c.size.h, color: o.color ?? c.color }
  }

  /** Add a piece whose rotated footprint is centred on (cx, cy). */
  private push(kind: FurnitureKind, cx: number, cy: number, w: number, d: number, h: number, color: string, rot: number): Furniture {
    const item: Furniture = {
      id: nanoid(), kind, position: { x: cx - w / 2, y: cy - d / 2 }, rotation: rot, size: { w, d, h }, color,
    }
    this.furniture.push(item)
    return item
  }

  /** Footprint extents on the plan for a piece whose back faces `side`. */
  private extents(side: Side, w: number, d: number) {
    return side === 'N' || side === 'S' ? { ew: w, ed: d } : { ew: d, ed: w }
  }

  /** Place a piece with its back flush against a wall of `box`, facing into the room. */
  place(kind: FurnitureKind, box: Box, side: Side, o: PlaceOpts = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    const { ew, ed } = this.extents(side, w, d)
    const gap = o.gap ?? WALL_GAP
    const align = o.align ?? 0.5
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0
    let x: number, y: number // top-left of the plan footprint
    if (side === 'N') { x = box.x0 + gap + align * (bw - 2 * gap - ew); y = box.y0 + gap }
    else if (side === 'S') { x = box.x0 + gap + align * (bw - 2 * gap - ew); y = box.y1 - gap - ed }
    else if (side === 'W') { x = box.x0 + gap; y = box.y0 + gap + align * (bh - 2 * gap - ed) }
    else { x = box.x1 - gap - ew; y = box.y0 + gap + align * (bh - 2 * gap - ed) }
    return this.push(kind, x + ew / 2, y + ed / 2, w, d, h, color, BACK_TO[side])
  }

  /** Place a piece with its length (d) running along a wall — e.g. a bathtub
   *  with its long side against the wall. */
  lengthwise(kind: FurnitureKind, box: Box, side: Side, o: PlaceOpts = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    const horizontal = side === 'N' || side === 'S'
    const ew = horizontal ? d : w, ed = horizontal ? w : d
    const gap = o.gap ?? WALL_GAP
    const align = o.align ?? 0.5
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0
    let x: number, y: number
    if (side === 'N') { x = box.x0 + gap + align * (bw - 2 * gap - ew); y = box.y0 + gap }
    else if (side === 'S') { x = box.x0 + gap + align * (bw - 2 * gap - ew); y = box.y1 - gap - ed }
    else if (side === 'W') { x = box.x0 + gap; y = box.y0 + gap + align * (bh - 2 * gap - ed) }
    else { x = box.x1 - gap - ew; y = box.y0 + gap + align * (bh - 2 * gap - ed) }
    return this.push(kind, x + ew / 2, y + ed / 2, w, d, h, color, horizontal ? BACK_TO.W : BACK_TO.N)
  }

  /** Place a piece in a corner, back against `back` (defaults to the N/S wall of that corner). */
  corner(kind: FurnitureKind, box: Box, c: 'NW' | 'NE' | 'SW' | 'SE', o: PlaceOpts & { back?: Side } = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    const back = o.back ?? (c[0] as Side)
    const { ew, ed } = this.extents(back, w, d)
    const gap = o.gap ?? WALL_GAP
    const x = c[1] === 'W' ? box.x0 + gap : box.x1 - gap - ew
    const y = c[0] === 'N' ? box.y0 + gap : box.y1 - gap - ed
    return this.push(kind, x + ew / 2, y + ed / 2, w, d, h, color, BACK_TO[back])
  }

  /** Centre a free-standing piece at (cx, cy) with its back toward `back` (default north). */
  at(kind: FurnitureKind, cx: number, cy: number, o: PlaceOpts & { back?: Side } = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    return this.push(kind, cx, cy, w, d, h, color, BACK_TO[o.back ?? 'N'])
  }

  /** Chairs around a table centred at (cx, cy), fully outside its edges, evenly
   *  spread per side and turned to face the table. */
  chairsAround(cx: number, cy: number, tw: number, td: number, sides: {
    top?: number; bottom?: number; left?: number; right?: number; chair?: number; gap?: number
  }): Furniture[] {
    const ch = sides.chair ?? 46, g = sides.gap ?? 3
    const out: Furniture[] = []
    const spread = (n: number, span: number) =>
      n <= 0 ? [] : n === 1 ? [0] : Array.from({ length: n }, (_, i) => -span / 2 + span * (i / (n - 1)))
    const chair = (x: number, y: number, back: Side) => out.push(this.at('chair', x, y, { w: ch, d: ch, back }))
    for (const dx of spread(sides.top ?? 0, tw - ch)) chair(cx + dx, cy - td / 2 - g - ch / 2, 'N')
    for (const dx of spread(sides.bottom ?? 0, tw - ch)) chair(cx + dx, cy + td / 2 + g + ch / 2, 'S')
    for (const dy of spread(sides.left ?? 0, td - ch)) chair(cx - tw / 2 - g - ch / 2, cy + dy, 'W')
    for (const dy of spread(sides.right ?? 0, td - ch)) chair(cx + tw / 2 + g + ch / 2, cy + dy, 'E')
    return out
  }

  /** Several pieces in a run along a wall (e.g. a kitchen counter), packed end-to-end. */
  row(kinds: FurnitureKind[], box: Box, side: Side, o: {
    gap?: number; margin?: number; lane?: number
    sizes?: Partial<Record<FurnitureKind, { w?: number; d?: number; h?: number }>>
  } = {}): Furniture[] {
    const gap = o.gap ?? 6
    const margin = o.margin ?? WALL_GAP
    const lane = o.lane ?? WALL_GAP
    const out: Furniture[] = []
    let cursor = (side === 'N' || side === 'S') ? box.x0 + margin : box.y0 + margin
    for (const kind of kinds) {
      const c = CATALOG_MAP[kind]
      const sz = o.sizes?.[kind] ?? {}
      const w = sz.w ?? c.size.w, d = sz.d ?? c.size.d, h = sz.h ?? c.size.h
      const { ew, ed } = this.extents(side, w, d)
      let x: number, y: number
      if (side === 'N') { x = cursor; y = box.y0 + lane; cursor += ew + gap }
      else if (side === 'S') { x = cursor; y = box.y1 - lane - ed; cursor += ew + gap }
      else if (side === 'W') { x = box.x0 + lane; y = cursor; cursor += ed + gap }
      else { x = box.x1 - lane - ew; y = cursor; cursor += ed + gap }
      out.push(this.push(kind, x + ew / 2, y + ed / 2, w, d, h, c.color, BACK_TO[side]))
    }
    return out
  }

  static box(x0: number, y0: number, x1: number, y1: number): Box {
    return { x0, y0, x1, y1 }
  }

  toDesign(name: string): Design {
    const floor: Floor = { id: nanoid(), name, height: 270, walls: this.walls, openings: this.openings, furniture: this.furniture }
    return { version: CURRENT_VERSION, floors: [floor] }
  }
}

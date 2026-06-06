import { nanoid } from 'nanoid'
import type { Design, Floor, Wall, Opening, Furniture, FurnitureKind } from '../store/types'
import { CURRENT_VERSION } from './storage'
import { CATALOG_MAP } from '../geometry/catalog'

// A declarative floor-plan builder. Furniture is anchored to walls with real
// clearances so pieces hug walls and never float in the middle of a room.
// Everything is axis-aligned (rotation 0) which keeps layouts tidy and makes
// collision auditing exact.

export type Side = 'N' | 'S' | 'E' | 'W'
/** Wall-centerline rectangle of a room, in cm. */
export type Box = { x0: number; y0: number; x1: number; y1: number }

export const WALL_GAP = 14 // default clearance from a wall (cm)

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

  /** Outer rectangle → 4 walls (n,e,s,w) with consistent directions. */
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

  /** Door centered at fraction `frac` (0..1) along the wall. */
  doorAt(wall: Wall, frac: number, width = 90, height = 210) {
    this.openings.push({ id: nanoid(), wallId: wall.id, type: 'door', offset: this.offsetFor(wall, frac, width), width, height, sillHeight: 0 })
  }
  winAt(wall: Wall, frac: number, width = 120, height = 130, sill = 90) {
    this.openings.push({ id: nanoid(), wallId: wall.id, type: 'window', offset: this.offsetFor(wall, frac, width), width, height, sillHeight: sill })
  }
  private offsetFor(wall: Wall, frac: number, width: number) {
    const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y)
    return Math.max(4, Math.min(len - width - 4, frac * len - width / 2))
  }

  private resolve(kind: FurnitureKind, o: PlaceOpts) {
    const c = CATALOG_MAP[kind]
    return { w: o.w ?? c.size.w, d: o.d ?? c.size.d, h: o.h ?? c.size.h, color: o.color ?? c.color }
  }
  private push(kind: FurnitureKind, x: number, y: number, w: number, d: number, h: number, color: string, rot = 0): Furniture {
    const item: Furniture = { id: nanoid(), kind, position: { x, y }, rotation: rot, size: { w, d, h }, color }
    this.furniture.push(item)
    return item
  }

  /** Place one item flush against a wall of `box`, inset by `gap` on every side. */
  place(kind: FurnitureKind, box: Box, side: Side, o: PlaceOpts = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    const gap = o.gap ?? WALL_GAP
    const align = o.align ?? 0.5
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0
    let x: number, y: number
    if (side === 'N') { x = box.x0 + gap + align * (bw - 2 * gap - w); y = box.y0 + gap }
    else if (side === 'S') { x = box.x0 + gap + align * (bw - 2 * gap - w); y = box.y1 - gap - d }
    else if (side === 'W') { x = box.x0 + gap; y = box.y0 + gap + align * (bh - 2 * gap - d) }
    else { x = box.x1 - gap - w; y = box.y0 + gap + align * (bh - 2 * gap - d) }
    return this.push(kind, x, y, w, d, h, color)
  }

  /** Place an item in a corner of `box`. */
  corner(kind: FurnitureKind, box: Box, c: 'NW' | 'NE' | 'SW' | 'SE', o: PlaceOpts = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    const gap = o.gap ?? WALL_GAP
    const x = c[1] === 'W' ? box.x0 + gap : box.x1 - gap - w
    const y = c[0] === 'N' ? box.y0 + gap : box.y1 - gap - d
    return this.push(kind, x, y, w, d, h, color)
  }

  /** Center an item at a point (cm). */
  at(kind: FurnitureKind, cx: number, cy: number, o: PlaceOpts = {}): Furniture {
    const { w, d, h, color } = this.resolve(kind, o)
    return this.push(kind, cx - w / 2, cy - d / 2, w, d, h, color)
  }

  /** Place chairs around a table centered at (cx,cy), fully outside its edges
   *  (small gap) and evenly spread per side — never overlapping the table. */
  chairsAround(cx: number, cy: number, tw: number, td: number, sides: {
    top?: number; bottom?: number; left?: number; right?: number; chair?: number; gap?: number
  }): Furniture[] {
    const ch = sides.chair ?? 46, g = sides.gap ?? 3
    const out: Furniture[] = []
    const spread = (n: number, span: number) =>
      n <= 0 ? [] : n === 1 ? [0] : Array.from({ length: n }, (_, i) => -span / 2 + span * (i / (n - 1)))
    for (const dx of spread(sides.top ?? 0, tw - ch)) out.push(this.at('chair', cx + dx, cy - td / 2 - g - ch / 2, { w: ch, d: ch }))
    for (const dx of spread(sides.bottom ?? 0, tw - ch)) out.push(this.at('chair', cx + dx, cy + td / 2 + g + ch / 2, { w: ch, d: ch }))
    for (const dy of spread(sides.left ?? 0, td - ch)) out.push(this.at('chair', cx - tw / 2 - g - ch / 2, cy + dy, { w: ch, d: ch }))
    for (const dy of spread(sides.right ?? 0, td - ch)) out.push(this.at('chair', cx + tw / 2 + g + ch / 2, cy + dy, { w: ch, d: ch }))
    return out
  }

  /** Lay several items in a run along a wall, packed end-to-end with a gap.
   *  Sizes default to the catalog; per-kind overrides via `sizes`. */
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
      let x: number, y: number
      if (side === 'N') { x = cursor; y = box.y0 + lane; cursor += w + gap }
      else if (side === 'S') { x = cursor; y = box.y1 - lane - d; cursor += w + gap }
      else if (side === 'W') { x = box.x0 + lane; y = cursor; cursor += d + gap }
      else { x = box.x1 - lane - w; y = cursor; cursor += d + gap }
      out.push(this.push(kind, x, y, w, d, h, c.color))
    }
    return out
  }

  /** Interior box just inside a rect's wall centerlines. */
  static box(x0: number, y0: number, x1: number, y1: number): Box {
    return { x0, y0, x1, y1 }
  }

  toDesign(name: string): Design {
    const floor: Floor = { id: nanoid(), name, height: 270, walls: this.walls, openings: this.openings, furniture: this.furniture }
    return { version: CURRENT_VERSION, floors: [floor] }
  }
}

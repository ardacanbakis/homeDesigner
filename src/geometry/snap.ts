import type { Wall, Furniture } from '../store/types'

/** Snap a furniture footprint (top-left x,y + size w,d) so its nearest edge
 *  sits flush against the inner face of any axis-aligned wall within `thr` cm.
 *  X and Y are snapped independently against the closest qualifying wall. */
export function snapBoxToWalls(
  x: number, y: number, w: number, d: number, walls: Wall[], thr = 22,
): { x: number; y: number } {
  let nx = x, ny = y
  let bestDX = thr, bestDY = thr
  const cx = x + w / 2, cy = y + d / 2
  for (const wl of walls) {
    const vertical = Math.abs(wl.a.x - wl.b.x) < 1e-6
    const horizontal = Math.abs(wl.a.y - wl.b.y) < 1e-6
    const t = (wl.thickness ?? 15) / 2
    if (vertical) {
      const wx = wl.a.x
      const y0 = Math.min(wl.a.y, wl.b.y), y1 = Math.max(wl.a.y, wl.b.y)
      if (y + d < y0 - thr || y > y1 + thr) continue // no overlap along the wall
      const target = cx <= wx ? wx - t - w : wx + t
      const dxd = Math.abs(target - x)
      if (dxd < bestDX) { bestDX = dxd; nx = target }
    } else if (horizontal) {
      const wy = wl.a.y
      const x0 = Math.min(wl.a.x, wl.b.x), x1 = Math.max(wl.a.x, wl.b.x)
      if (x + w < x0 - thr || x > x1 + thr) continue
      const target = cy <= wy ? wy - t - d : wy + t
      const dyd = Math.abs(target - y)
      if (dyd < bestDY) { bestDY = dyd; ny = target }
    }
  }
  return { x: nx, y: ny }
}

/** True if two footprints overlap by more than `tol` cm on both axes. */
export function footprintsOverlap(a: Furniture, b: Furniture, tol = 1): boolean {
  const ox = Math.min(a.position.x + a.size.w, b.position.x + b.size.w) - Math.max(a.position.x, b.position.x)
  const oy = Math.min(a.position.y + a.size.d, b.position.y + b.size.d) - Math.max(a.position.y, b.position.y)
  return ox > tol && oy > tol
}

/** Ids of furniture that overlap at least one other piece on the same floor. */
export function collidingIds(furniture: Furniture[]): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      if (footprintsOverlap(furniture[i], furniture[j])) {
        out.add(furniture[i].id); out.add(furniture[j].id)
      }
    }
  }
  return out
}

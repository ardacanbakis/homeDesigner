import type { Furniture, Units } from '../store/types'

export const CM_PER_INCH = 2.54
export const CM_PER_FOOT = 30.48
const CM2_PER_FT2 = CM_PER_FOOT * CM_PER_FOOT

/** Snap step (cm) for each unit system: 5 cm metric, 1 inch imperial. */
export function snapStepFor(units: Units): number {
  return units === 'ftin' ? CM_PER_INCH : 5
}

/** Grid tiers (cm) drawn on the 2D canvas for each unit system. */
export function gridTiersFor(units: Units): { minor: number; major: number } {
  return units === 'ftin'
    ? { minor: 6 * CM_PER_INCH, major: CM_PER_FOOT }
    : { minor: 5, major: 50 }
}

/** Human-readable length: "250 cm", "2.50 m" or `8' 2"`. */
export function formatLength(cm: number, units: Units): string {
  if (units === 'm') return `${(cm / 100).toFixed(2)} m`
  if (units === 'ftin') {
    const sign = cm < 0 ? '-' : ''
    const totalIn = Math.round(Math.abs(cm) / CM_PER_INCH)
    const ft = Math.floor(totalIn / 12)
    const inch = totalIn % 12
    return ft === 0 ? `${sign}${inch}"` : `${sign}${ft}' ${inch}"`
  }
  return `${Math.round(cm)} cm`
}

/** Human-readable floor area: "12.4 m²" or "134 ft²". */
export function formatArea(cm2: number, units: Units): string {
  return units === 'ftin'
    ? `${Math.round(cm2 / CM2_PER_FT2)} ft²`
    : `${(cm2 / 10000).toFixed(1)} m²`
}

const NUM = '(\\d+(?:\\.\\d+)?|\\.\\d+)'

/** Parse a typed length into cm. Explicit units always win ("2.5m", "8' 2\"",
 *  "96in", "250cm", "300mm"); a bare number is read in the current unit —
 *  inches in ft-in mode, and two bare numbers ("8 2") mean feet + inches.
 *  Returns null when the text isn't a valid positive length. */
export function parseLength(input: string, units: Units): number | null {
  const s = input.trim().toLowerCase().replace(/[′’]/g, "'").replace(/[″”]/g, '"').replace(',', '.')
  if (!s) return null
  let m: RegExpMatchArray | null
  const ok = (cm: number) => (Number.isFinite(cm) && cm > 0 ? cm : null)

  if ((m = s.match(new RegExp(`^${NUM}\\s*mm$`)))) return ok(parseFloat(m[1]) / 10)
  if ((m = s.match(new RegExp(`^${NUM}\\s*cm$`)))) return ok(parseFloat(m[1]))
  if ((m = s.match(new RegExp(`^${NUM}\\s*m$`)))) return ok(parseFloat(m[1]) * 100)
  // feet with optional inches: 8'  8' 2"  8ft 2in  8' 2
  if ((m = s.match(new RegExp(`^${NUM}\\s*(?:'|ft|feet|foot)\\s*(?:${NUM}\\s*(?:"|in|inch|inches)?)?$`))))
    return ok(parseFloat(m[1]) * CM_PER_FOOT + (m[2] ? parseFloat(m[2]) * CM_PER_INCH : 0))
  if ((m = s.match(new RegExp(`^${NUM}\\s*(?:"|in|inch|inches)$`)))) return ok(parseFloat(m[1]) * CM_PER_INCH)

  if ((m = s.match(new RegExp(`^${NUM}$`)))) {
    const n = parseFloat(m[1])
    if (units === 'm') return ok(n * 100)
    if (units === 'ftin') return ok(n * CM_PER_INCH)
    return ok(n)
  }
  if (units === 'ftin' && (m = s.match(new RegExp(`^${NUM}\\s+${NUM}$`))))
    return ok(parseFloat(m[1]) * CM_PER_FOOT + parseFloat(m[2]) * CM_PER_INCH)
  return null
}

/** Width/depth of the axis-aligned box enclosing a w×d rectangle rotated by `rot` radians. */
export function rotatedExtents(w: number, d: number, rot: number): { ew: number; ed: number } {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot))
  return { ew: w * c + d * s, ed: w * s + d * c }
}

/** Axis-aligned bounding box of a (possibly rotated) furniture footprint, in cm. */
export function footprintAABB(f: Pick<Furniture, 'position' | 'size' | 'rotation'>) {
  const cx = f.position.x + f.size.w / 2
  const cy = f.position.y + f.size.d / 2
  const { ew, ed } = rotatedExtents(f.size.w, f.size.d, f.rotation)
  return { x0: cx - ew / 2, y0: cy - ed / 2, x1: cx + ew / 2, y1: cy + ed / 2 }
}

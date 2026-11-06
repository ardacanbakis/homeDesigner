import { describe, expect, it } from 'vitest'
import { snapBoxToWalls, footprintsOverlap, collidingIds } from './snap'
import { customColor } from './catalog'
import type { Wall, Furniture } from '../store/types'

const wallV: Wall = { id: 'v', a: { x: 200, y: 0 }, b: { x: 200, y: 300 }, thickness: 10, height: 260 }
const wallH: Wall = { id: 'h', a: { x: 0, y: 200 }, b: { x: 300, y: 200 }, thickness: 10, height: 260 }

function furn(x: number, y: number, w = 100, d = 100): Furniture {
  return { id: `${x},${y}`, kind: 'chair', position: { x, y }, rotation: 0, size: { w, d, h: 50 } }
}

describe('snapBoxToWalls', () => {
  it('snaps a box flush to the left face of a vertical wall', () => {
    const r = snapBoxToWalls(160, 50, 40, 40, [wallV]) // centre 180 < 200 → left side
    expect(r.x).toBeCloseTo(200 - 5 - 40) // wx - halfThickness - w = 155
    expect(r.y).toBe(50)
  })

  it('snaps a box flush to the right face of a vertical wall', () => {
    const r = snapBoxToWalls(212, 50, 40, 40, [wallV]) // centre 232 > 200 → right side
    expect(r.x).toBeCloseTo(205) // wx + halfThickness
  })

  it('does not snap when the wall is beyond the threshold', () => {
    const r = snapBoxToWalls(100, 50, 40, 40, [wallV]) // 55 cm away
    expect(r.x).toBe(100)
  })

  it('does not snap when the box does not overlap the wall span', () => {
    const r = snapBoxToWalls(160, 400, 40, 40, [wallV]) // y 400..440 vs wall y 0..300
    expect(r.x).toBe(160)
  })

  it('snaps both axes against perpendicular walls', () => {
    const r = snapBoxToWalls(160, 160, 40, 40, [wallV, wallH])
    expect(r.x).toBeCloseTo(155)
    expect(r.y).toBeCloseTo(155)
  })
})

describe('footprintsOverlap', () => {
  it('detects overlapping footprints', () => {
    expect(footprintsOverlap(furn(0, 0), furn(50, 50))).toBe(true)
  })
  it('returns false for separated footprints', () => {
    expect(footprintsOverlap(furn(0, 0), furn(200, 0))).toBe(false)
  })
  it('returns false for merely touching edges', () => {
    expect(footprintsOverlap(furn(0, 0), furn(100, 0))).toBe(false)
  })
})

describe('collidingIds', () => {
  it('returns ids of all pieces that overlap something', () => {
    const a = furn(0, 0), b = furn(50, 50), far = furn(500, 500)
    const ids = collidingIds([a, b, far])
    expect(ids.has(a.id)).toBe(true)
    expect(ids.has(b.id)).toBe(true)
    expect(ids.has(far.id)).toBe(false)
  })
})

describe('rugs', () => {
  it('never count as overlapping — furniture stands on them', () => {
    const rug: Furniture = { ...furn(0, 0, 200, 140), id: 'rug', kind: 'rug' }
    expect(footprintsOverlap(rug, furn(50, 50))).toBe(false)
    expect(collidingIds([rug, furn(50, 50), furn(400, 400)]).size).toBe(0)
  })
})

describe('customColor', () => {
  it('treats the catalog colour as no custom colour', () => {
    expect(customColor({ kind: 'sofa', color: '#778899' })).toBeUndefined()
    expect(customColor({ kind: 'sofa', color: '#778899'.toUpperCase() })).toBeUndefined()
    expect(customColor({ kind: 'sofa' })).toBeUndefined()
    expect(customColor({ kind: 'sofa', color: '#8b3a3a' })).toBe('#8b3a3a')
    // Custom objects only have their own colour.
    expect(customColor({ kind: 'custom', color: '#64748b' })).toBe('#64748b')
  })
})

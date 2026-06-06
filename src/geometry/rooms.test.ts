import { describe, expect, it } from 'vitest'
import { deriveRooms, classifyRoom, pointInPolygon, roomColor } from './rooms'
import type { Wall, Furniture } from '../store/types'

let wallSeq = 0
function w(ax: number, ay: number, bx: number, by: number): Wall {
  return { id: `w${++wallSeq}`, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 260 }
}

let furnSeq = 0
function f(kind: Furniture['kind'], x: number, y: number, size = { w: 60, d: 60, h: 60 }): Furniture {
  return { id: `f${++furnSeq}`, kind, position: { x, y }, rotation: 0, size, color: '#888' }
}

describe('deriveRooms', () => {
  it('returns nothing when there are fewer than 3 walls', () => {
    expect(deriveRooms([])).toEqual([])
    expect(deriveRooms([w(0, 0, 100, 0)])).toEqual([])
  })

  it('finds one room for a single closed rectangle', () => {
    const walls = [
      w(0, 0, 100, 0),
      w(100, 0, 100, 200),
      w(100, 200, 0, 200),
      w(0, 200, 0, 0),
    ]
    const rooms = deriveRooms(walls)
    expect(rooms).toHaveLength(1)
    expect(rooms[0].area).toBeCloseTo(100 * 200) // 100×200 = 20000 cm²
    expect(rooms[0].vertices).toHaveLength(4)
  })

  it('finds two rooms when a partition splits a rectangle', () => {
    const walls = [
      // outer
      w(0, 0, 200, 0),
      w(200, 0, 200, 100),
      w(200, 100, 0, 100),
      w(0, 100, 0, 0),
      // partition at x=100
      w(100, 0, 100, 100),
    ]
    const rooms = deriveRooms(walls)
    expect(rooms).toHaveLength(2)
    for (const r of rooms) {
      expect(r.area).toBeCloseTo(100 * 100)
    }
  })

  it('places the centroid inside the room for a convex polygon', () => {
    const walls = [
      w(0, 0, 100, 0),
      w(100, 0, 100, 200),
      w(100, 200, 0, 200),
      w(0, 200, 0, 0),
    ]
    const [room] = deriveRooms(walls)
    expect(room.centroid.x).toBeCloseTo(50)
    expect(room.centroid.y).toBeCloseTo(100)
  })

  it('snaps near-coincident endpoints onto the same vertex', () => {
    // Endpoints offset by 0.2 cm — below the 0.5 cm snap precision.
    const walls = [
      w(0, 0, 100, 0),
      w(100.2, 0, 100, 100),
      w(100, 100, 0, 100),
      w(0, 100, 0, 0),
    ]
    expect(deriveRooms(walls)).toHaveLength(1)
  })

  it('ignores degenerate slivers below ~0.01 m²', () => {
    // A 5 cm × 5 cm room = 25 cm², below the 100 cm² threshold.
    const walls = [
      w(0, 0, 5, 0),
      w(5, 0, 5, 5),
      w(5, 5, 0, 5),
      w(0, 5, 0, 0),
    ]
    expect(deriveRooms(walls)).toEqual([])
  })
})

describe('classifyRoom', () => {
  const rectWalls = [
    w(0, 0, 300, 0),
    w(300, 0, 300, 300),
    w(300, 300, 0, 300),
    w(0, 300, 0, 0),
  ]
  const [room] = deriveRooms(rectWalls)

  it('falls back to "Room" when nothing is inside', () => {
    expect(classifyRoom(room, [])).toBe('Room')
  })

  it('labels a room with a bed as a Bedroom', () => {
    const items = [f('bed', 80, 80, { w: 160, d: 200, h: 50 })]
    expect(classifyRoom(room, items)).toBe('Bedroom')
  })

  it('labels a room with a toilet + bathtub as a Bathroom over a single sink', () => {
    const items = [
      f('sink',    80,  20),
      f('toilet', 120,  80),
      f('bathtub', 60, 160, { w: 80, d: 170, h: 60 }),
    ]
    expect(classifyRoom(room, items)).toBe('Bathroom')
  })

  it('labels a room with sofa + tv as a Living room', () => {
    const items = [
      f('sofa', 20, 20, { w: 200, d: 90, h: 85 }),
      f('tv',   60, 220),
    ]
    expect(classifyRoom(room, items)).toBe('Living')
  })

  it('ignores furniture whose centre lies outside the polygon', () => {
    const items = [f('bed', 500, 500, { w: 160, d: 200, h: 50 })] // far outside
    expect(classifyRoom(room, items)).toBe('Room')
  })

  it('labels an open-plan room with bed + kitchen as a Studio', () => {
    const items = [
      f('bed', 20, 20, { w: 150, d: 200, h: 50 }),
      f('fridge', 240, 20, { w: 60, d: 60, h: 185 }),
      f('sofa', 40, 220, { w: 180, d: 85, h: 85 }),
    ]
    expect(classifyRoom(room, items)).toBe('Studio')
  })

  it('labels sofa + kitchen (no bed) as Living + Kitchen', () => {
    const items = [
      f('fridge', 240, 20, { w: 60, d: 60, h: 185 }),
      f('stove', 180, 20, { w: 60, d: 60, h: 90 }),
      f('sofa', 40, 220, { w: 180, d: 85, h: 85 }),
    ]
    expect(classifyRoom(room, items)).toBe('Living + Kitchen')
  })

  it('labels kitchen + table as a Kitchen-Diner', () => {
    const items = [
      f('fridge', 240, 20, { w: 60, d: 60, h: 185 }),
      f('stove', 180, 20, { w: 60, d: 60, h: 90 }),
      f('table', 120, 160, { w: 120, d: 75, h: 75 }),
    ]
    expect(classifyRoom(room, items)).toBe('Kitchen-Diner')
  })

  it('labels two or more desks as an Office', () => {
    const items = [
      f('desk', 30, 30, { w: 140, d: 64, h: 75 }),
      f('desk', 30, 180, { w: 140, d: 64, h: 75 }),
    ]
    expect(classifyRoom(room, items)).toBe('Office')
  })
})

describe('deriveRooms — robustness', () => {
  it('ignores a dangling partition wall that does not close a loop', () => {
    const walls = [
      // closed rectangle
      w(0, 0, 200, 0), w(200, 0, 200, 200), w(200, 200, 0, 200), w(0, 200, 0, 0),
      // a stray wall sticking into the room from the top, not closing anything
      w(100, 0, 100, 90),
    ]
    // Still exactly one room; the dangling wall is pruned.
    expect(deriveRooms(walls)).toHaveLength(1)
  })
})

describe('pointInPolygon', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]

  it('says yes for interior points', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
  })

  it('says no for exterior points', () => {
    expect(pointInPolygon({ x: 20, y: 5 }, square)).toBe(false)
    expect(pointInPolygon({ x: -1, y: 5 }, square)).toBe(false)
  })
})

describe('roomColor', () => {
  it('produces a deterministic hsl color', () => {
    expect(roomColor('abc')).toBe(roomColor('abc'))
    expect(roomColor('abc')).toMatch(/^hsl\(\d+ \d+% \d+%\)$/)
  })

  it('produces different colors for different ids', () => {
    expect(roomColor('abc')).not.toBe(roomColor('xyz123'))
  })
})

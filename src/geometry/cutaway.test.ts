import { describe, it, expect } from 'vitest'
import type { Wall } from '../store/types'
import { deriveRooms } from './rooms'
import { wallInsideSides, insideDistance } from './cutaway'

const wall = (id: string, ax: number, ay: number, bx: number, by: number): Wall =>
  ({ id, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 270 })

// A 600 × 400 box split by a partition at x = 300. Walls run clockwise on
// screen (y down): top, right, bottom, left.
const walls = [
  wall('top', 0, 0, 600, 0),
  wall('right', 600, 0, 600, 400),
  wall('bottom', 600, 400, 0, 400),
  wall('left', 0, 400, 0, 0),
  wall('mid', 300, 0, 300, 400),
]

describe('wallInsideSides', () => {
  const sides = wallInsideSides(walls, deriveRooms(walls))

  it('puts the building on the correct side of each exterior wall', () => {
    // Left-hand normal of top (0,0)→(600,0) is (0,−1), pointing out of the box.
    expect(sides.get('top')).toBe(-1)
    expect(sides.get('right')).toBe(-1)
    expect(sides.get('bottom')).toBe(-1)
    expect(sides.get('left')).toBe(-1)
  })

  it('marks walls with rooms on both sides as interior', () => {
    expect(sides.get('mid')).toBe(0)
  })

  it('falls back to the middle of the plan when there are no rooms', () => {
    const open = [wall('a', 0, 0, 600, 0), wall('b', 600, 0, 600, 400)]
    const s = wallInsideSides(open, deriveRooms(open))
    expect(s.get('a')).toBe(-1) // the plan's middle (300, 200) is below the wall
    expect(s.get('b')).toBe(-1)
  })
})

describe('insideDistance', () => {
  const sides = wallInsideSides(walls, deriveRooms(walls))
  const top = walls[0], bottom = walls[2], mid = walls[4]

  it('is positive for a back wall and negative for a wall in front', () => {
    // Camera south of the house (large y), looking north.
    const cam = { x: 300, y: 1500 }
    expect(insideDistance(top, sides.get('top')!, cam)).toBeGreaterThan(0) // back wall stays up
    expect(insideDistance(bottom, sides.get('bottom')!, cam)).toBeLessThan(0) // front wall is cut
  })

  it('measures the distance from the wall line in cm', () => {
    expect(insideDistance(top, sides.get('top')!, { x: 0, y: 250 })).toBeCloseTo(250)
  })

  it('always cuts interior walls', () => {
    expect(insideDistance(mid, 0, { x: 0, y: 0 })).toBe(-Infinity)
  })
})

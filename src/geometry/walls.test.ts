import { describe, expect, it } from 'vitest'
import { wallLength, wallAngle, snapPoint, dist, SNAP_DIST } from './walls'
import type { Wall } from '../store/types'

function w(ax: number, ay: number, bx: number, by: number): Wall {
  return { id: 'w', a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 260 }
}

describe('wallLength', () => {
  it('measures axis-aligned segments', () => {
    expect(wallLength(w(0, 0, 100, 0))).toBe(100)
    expect(wallLength(w(0, 0, 0, 250))).toBe(250)
  })

  it('measures diagonals', () => {
    expect(wallLength(w(0, 0, 3, 4))).toBeCloseTo(5)
  })

  it('returns zero for a degenerate wall', () => {
    expect(wallLength(w(50, 50, 50, 50))).toBe(0)
  })
})

describe('wallAngle', () => {
  it('returns 0 for a wall pointing east', () => {
    expect(wallAngle(w(0, 0, 100, 0))).toBe(0)
  })

  it('returns π/2 for a wall pointing south (+y in screen coords)', () => {
    expect(wallAngle(w(0, 0, 0, 100))).toBeCloseTo(Math.PI / 2)
  })

  it('returns π for a wall pointing west', () => {
    expect(wallAngle(w(0, 0, -100, 0))).toBeCloseTo(Math.PI)
  })
})

describe('snapPoint', () => {
  const walls = [w(100, 100, 200, 100)] // endpoints at (100,100) and (200,100)

  it('snaps a near-endpoint exactly onto the endpoint', () => {
    const p = snapPoint({ x: 100 + 5, y: 100 + 3 }, walls, 50)
    expect(p).toEqual({ x: 100, y: 100 })
  })

  it('snaps to the grid when no endpoint is within SNAP_DIST', () => {
    const p = snapPoint({ x: 33, y: 77 }, walls, 50)
    expect(p).toEqual({ x: 50, y: 100 })
  })

  it('prefers an endpoint just inside SNAP_DIST over the grid', () => {
    // SNAP_DIST is 15 cm. (110, 100) is 10 cm away from endpoint (100,100).
    const p = snapPoint({ x: 110, y: 100 }, walls, 50)
    expect(p).toEqual({ x: 100, y: 100 })
  })

  it('falls back to the grid when the nearest endpoint is just outside SNAP_DIST', () => {
    // (120, 100) is 20 cm away from endpoint (100,100) — outside SNAP_DIST=15.
    const p = snapPoint({ x: 120, y: 100 }, walls, 10)
    expect(p).toEqual({ x: 120, y: 100 })
  })
})

describe('dist', () => {
  it('measures euclidean distance', () => {
    expect(dist({ x: 0, y: 0 }, { x: 6, y: 8 })).toBeCloseTo(10)
  })

  it('is symmetric', () => {
    expect(dist({ x: 3, y: 4 }, { x: -1, y: -1 })).toBeCloseTo(dist({ x: -1, y: -1 }, { x: 3, y: 4 }))
  })
})

it('SNAP_DIST stays at the documented 15 cm', () => {
  expect(SNAP_DIST).toBe(15)
})

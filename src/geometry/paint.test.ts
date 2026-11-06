import { describe, it, expect } from 'vitest'
import type { RoomTag, Wall } from '../store/types'
import { deriveRooms } from './rooms'
import { wallPaintSpans, rectsAround } from './paint'

const wall = (id: string, ax: number, ay: number, bx: number, by: number): Wall =>
  ({ id, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 270 })

// Two rooms side by side: left (0–300) and right (300–600), with the
// partition meeting the top and bottom walls mid-way (T-junctions).
const walls = [
  wall('top', 0, 0, 600, 0),
  wall('right', 600, 0, 600, 400),
  wall('bottom', 600, 400, 0, 400),
  wall('left', 0, 400, 0, 0),
  wall('mid', 300, 0, 300, 400),
]
const rooms = deriveRooms(walls)
const tag = (x: number, y: number, paint?: string): RoomTag => ({ id: `${x}`, at: { x, y }, paint })

describe('wallPaintSpans', () => {
  it('is empty when no room is painted', () => {
    expect(wallPaintSpans(walls, rooms, [tag(100, 100)]).size).toBe(0)
    expect(wallPaintSpans(walls, rooms, undefined).size).toBe(0)
  })

  it('paints only the painted room’s side of each wall, split at junctions', () => {
    const spans = wallPaintSpans(walls, rooms, [tag(100, 200, '#B3C1A4')])
    // The top wall borders the left room for its first 300 cm, on its inside (−1).
    expect(spans.get('top')).toEqual([{ side: -1, from: 0, to: 300, color: '#B3C1A4' }])
    // The bottom wall runs right to left, so the left room is its last 300 cm.
    expect(spans.get('bottom')).toEqual([{ side: -1, from: 300, to: 600, color: '#B3C1A4' }])
    expect(spans.get('left')).toEqual([{ side: -1, from: 0, to: 400, color: '#B3C1A4' }])
    expect(spans.has('right')).toBe(false)
    // The partition: the normal (u.y, −u.x) of (300,0)→(300,400) is +x, the right room.
    expect(spans.get('mid')).toEqual([{ side: -1, from: 0, to: 400, color: '#B3C1A4' }])
  })

  it('gives each face of a partition its own room’s colour and joins same-colour pieces', () => {
    const spans = wallPaintSpans(walls, rooms, [tag(100, 200, '#111111'), tag(500, 200, '#222222')])
    expect(spans.get('mid')).toEqual([
      { side: 1, from: 0, to: 400, color: '#222222' },
      { side: -1, from: 0, to: 400, color: '#111111' },
    ])
    expect(spans.get('top')).toEqual([
      { side: -1, from: 0, to: 300, color: '#111111' },
      { side: -1, from: 300, to: 600, color: '#222222' },
    ])
    const same = wallPaintSpans(walls, rooms, [tag(100, 200, '#111111'), tag(500, 200, '#111111')])
    expect(same.get('top')).toEqual([{ side: -1, from: 0, to: 600, color: '#111111' }])
  })
})

describe('rectsAround', () => {
  it('returns the whole rectangle without holes', () => {
    expect(rectsAround(0, 4, 0, 3, [])).toEqual([[0, 0, 4, 3]])
  })

  it('leaves a door-shaped gap and a window-shaped hole', () => {
    const door = { x0: 1, x1: 2, y0: 0, y1: 2 }
    const win = { x0: 3, x1: 3.5, y0: 1, y1: 2 }
    const rects = rectsAround(0, 4, 0, 3, [door, win])
    const area = rects.reduce((s, [a, b, c, d]) => s + (c - a) * (d - b), 0)
    expect(area).toBeCloseTo(12 - 2 - 0.5)
    // Nothing overlaps either opening.
    for (const [a, b, c, d] of rects) {
      for (const h of [door, win]) {
        const overlap = Math.max(0, Math.min(c, h.x1) - Math.max(a, h.x0)) * Math.max(0, Math.min(d, h.y1) - Math.max(b, h.y0))
        expect(overlap).toBe(0)
      }
    }
  })

  it('clips openings that run past the painted stretch', () => {
    const rects = rectsAround(0, 2, 0, 3, [{ x0: 1.5, x1: 3, y0: 0, y1: 2 }])
    const area = rects.reduce((s, [a, b, c, d]) => s + (c - a) * (d - b), 0)
    expect(area).toBeCloseTo(6 - 0.5 * 2)
  })
})

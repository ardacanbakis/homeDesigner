import { describe, expect, it } from 'vitest'
import { formatLength, formatArea, parseLength, rotatedExtents, footprintAABB, snapStepFor } from './measure'

describe('formatLength', () => {
  it('formats centimetres', () => expect(formatLength(249.6, 'cm')).toBe('250 cm'))
  it('formats metres with two decimals', () => expect(formatLength(250, 'm')).toBe('2.50 m'))
  it('formats feet and inches', () => expect(formatLength(248.92, 'ftin')).toBe(`8' 2"`))
  it('drops the feet part under a foot', () => expect(formatLength(15.24, 'ftin')).toBe('6"'))
  it('rolls 12 inches over to a foot', () => expect(formatLength(30.4, 'ftin')).toBe(`1' 0"`))
})

describe('formatArea', () => {
  it('reports square metres for metric', () => expect(formatArea(124000, 'cm')).toBe('12.4 m²'))
  it('reports square feet for imperial', () => expect(formatArea(929.0304 * 134, 'ftin')).toBe('134 ft²'))
})

describe('parseLength', () => {
  it('reads a bare number in the current unit', () => {
    expect(parseLength('250', 'cm')).toBe(250)
    expect(parseLength('2.5', 'm')).toBe(250)
    expect(parseLength('10', 'ftin')).toBeCloseTo(25.4) // inches, like SketchUp
  })
  it('honours explicit units regardless of mode', () => {
    expect(parseLength('2.5m', 'ftin')).toBe(250)
    expect(parseLength('250 cm', 'm')).toBe(250)
    expect(parseLength('300mm', 'cm')).toBe(30)
    expect(parseLength('96in', 'cm')).toBeCloseTo(243.84)
  })
  it('reads feet + inches in several spellings', () => {
    expect(parseLength(`8' 2"`, 'cm')).toBeCloseTo(248.92)
    expect(parseLength('8ft 2in', 'cm')).toBeCloseTo(248.92)
    expect(parseLength("8'", 'cm')).toBeCloseTo(243.84)
    expect(parseLength('8 2', 'ftin')).toBeCloseTo(248.92)
    expect(parseLength('8′ 2″', 'cm')).toBeCloseTo(248.92)
  })
  it('round-trips formatted output', () => {
    for (const u of ['cm', 'm', 'ftin'] as const) {
      const cm = parseLength(formatLength(248.92, u), u)!
      expect(Math.abs(cm - 248.92)).toBeLessThan(u === 'ftin' ? 1.3 : 0.6)
    }
  })
  it('rejects empty, zero, negative and junk input', () => {
    expect(parseLength('', 'cm')).toBeNull()
    expect(parseLength('0', 'cm')).toBeNull()
    expect(parseLength('-5', 'cm')).toBeNull()
    expect(parseLength('abc', 'cm')).toBeNull()
  })
})

describe('rotation helpers', () => {
  it('swaps extents at 90°', () => {
    const { ew, ed } = rotatedExtents(200, 100, Math.PI / 2)
    expect(ew).toBeCloseTo(100)
    expect(ed).toBeCloseTo(200)
  })
  it('grows the box at 45°', () => {
    const { ew } = rotatedExtents(100, 100, Math.PI / 4)
    expect(ew).toBeCloseTo(141.42, 1)
  })
  it('keeps the AABB centred on the footprint centre', () => {
    const box = footprintAABB({ position: { x: 0, y: 0 }, size: { w: 200, d: 100, h: 50 }, rotation: Math.PI / 2 })
    expect(box.x0).toBeCloseTo(50)
    expect(box.y0).toBeCloseTo(-50)
    expect(box.x1).toBeCloseTo(150)
    expect(box.y1).toBeCloseTo(150)
  })
})

it('snaps to 5 cm metric and 1 inch imperial', () => {
  expect(snapStepFor('cm')).toBe(5)
  expect(snapStepFor('m')).toBe(5)
  expect(snapStepFor('ftin')).toBeCloseTo(2.54)
})

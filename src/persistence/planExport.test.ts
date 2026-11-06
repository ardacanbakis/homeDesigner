import { describe, expect, it } from 'vitest'
import { planToSVG } from './planExport'
import { TEMPLATES } from './templates'
import type { Floor, Wall } from '../store/types'

let n = 0
const w = (ax: number, ay: number, bx: number, by: number): Wall =>
  ({ id: `w${n++}`, a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 260 })

/** 450 × 330 shell with a T-shaped partition (200 cm + 280 cm) making two rooms. */
function tFloor(): Floor {
  const walls = [w(0, 0, 450, 0), w(450, 0, 450, 330), w(450, 330, 0, 330), w(0, 330, 0, 0), w(170, 0, 170, 200), w(170, 200, 450, 200)]
  return {
    id: 'f', name: 'Test floor', height: 270, walls,
    openings: [
      { id: 'd', wallId: walls[5].id, type: 'door', offset: 100, width: 80, height: 210, sillHeight: 0 },
      { id: 'win', wallId: walls[0].id, type: 'window', offset: 40, width: 100, height: 120, sillHeight: 90 },
    ],
    furniture: [{ id: 'c', kind: 'custom', customLabel: '<b>Piano</b>', position: { x: 250, y: 40 }, rotation: 0, size: { w: 100, d: 60, h: 100 } }],
  }
}

describe('planToSVG', () => {
  it('produces a standalone SVG with a white background and pixel size', () => {
    const svg = planToSVG(tFloor(), { units: 'm', title: 'Plan' })
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="\d+" viewBox="/)
    expect(svg).toContain('fill="#ffffff"')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('labels exterior walls and overall size, but not interior partitions', () => {
    const svg = planToSVG(tFloor(), { units: 'm', title: 'Plan' })
    expect(svg).toContain('4.50 m')
    expect(svg).toContain('3.30 m')
    expect(svg).toContain('4.65 m') // overall, to the outer wall faces
    expect(svg).not.toContain('2.00 m')
    expect(svg).not.toContain('2.80 m')
  })

  it('draws a swing arc per door and a glazed panel per window', () => {
    const svg = planToSVG(tFloor(), { units: 'm', title: 'Plan' })
    expect(svg.match(/<path d="M [^"]* A /g)).toHaveLength(1)
    expect(svg.match(/<polygon [^>]*fill="#ffffff" stroke=/g)).toHaveLength(1)
  })

  it('escapes user text', () => {
    const svg = planToSVG(tFloor(), { units: 'm', title: 'A & B <plan>' })
    expect(svg).toContain('&lt;b&gt;Piano&lt;/b&gt;')
    expect(svg).toContain('A &amp; B &lt;plan&gt;')
    expect(svg).not.toContain('<b>')
  })

  it('uses imperial units when asked', () => {
    const svg = planToSVG(tFloor(), { units: 'ftin', title: 'Plan' })
    expect(svg).toContain('ft²')
    expect(svg).toContain('14&#39; 9&quot;') // 450 cm wall (quote marks are XML-escaped)
    expect(svg).toContain('6 ft') // scale bar
  })

  it('handles an empty floor without crashing', () => {
    const svg = planToSVG({ id: 'e', name: 'Empty', height: 270, walls: [], openings: [], furniture: [] }, { units: 'cm', title: 'Empty' })
    expect(svg).toContain('0 rooms')
  })

  it('renders every template', () => {
    for (const t of TEMPLATES) {
      const svg = planToSVG(t.build().floors[0], { units: 'm', title: t.name })
      expect(svg.length).toBeGreaterThan(2000)
      expect(svg).not.toMatch(/NaN|undefined|Infinity/)
    }
  })
})

describe('planToSVG — room tags', () => {
  it('uses custom room names and floor-finish fills (escaped)', () => {
    const floor = tFloor()
    floor.roomTags = [{ id: 't', at: { x: 300, y: 270 }, name: 'Den & "Library"', material: 'wood' }]
    const svg = planToSVG(floor, { units: 'cm', title: 'Plan' })
    expect(svg).toContain('Den &amp; &quot;Library&quot;')
    expect(svg).toContain('fill="#B08A5E" fill-opacity="0.38"')
  })

  it('draws a band of wall paint inside painted rooms only', () => {
    const floor = tFloor()
    floor.roomTags = [{ id: 't', at: { x: 300, y: 270 }, paint: '#B3C1A4' }]
    const svg = planToSVG(floor, { units: 'cm', title: 'Plan' })
    expect(svg.match(/stroke="#B3C1A4"/g)).toHaveLength(1)
  })
})

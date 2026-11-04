// @vitest-environment node
// CompressionStream lives in Node and browsers but not in jsdom.
import { describe, expect, it } from 'vitest'
import { encodeDesign, decodeDesign } from './share'
import { TEMPLATES } from './templates'
import type { Design } from '../store/types'

describe('share links', () => {
  it('round-trips every template with geometry intact and fresh ids', async () => {
    for (const t of TEMPLATES) {
      const original = t.build()
      const decoded = await decodeDesign(await encodeDesign(original))
      expect(decoded, t.id).not.toBeNull()
      const a = original.floors[0], b = decoded!.floors[0]
      expect(b.walls).toHaveLength(a.walls.length)
      expect(b.openings).toHaveLength(a.openings.length)
      expect(b.furniture).toHaveLength(a.furniture.length)
      expect(b.walls[0].a.x).toBeCloseTo(a.walls[0].a.x, 1)
      expect(b.furniture[0].size.w).toBeCloseTo(a.furniture[0].size.w, 1)
      // Openings still point at their (re-id'd) walls.
      const wallIds = new Set(b.walls.map(w => w.id))
      expect(b.openings.every(o => wallIds.has(o.wallId))).toBe(true)
      expect(b.walls[0].id).not.toBe(a.walls[0].id)
    }
  })

  it('produces a URL-safe payload of reasonable size', async () => {
    const payload = await encodeDesign(TEMPLATES.find(t => t.id === 'family')!.build())
    expect(payload).toMatch(/^v1\.[A-Za-z0-9_-]+$/)
    expect(payload.length).toBeLessThan(4000)
  })

  it('rejects garbage, wrong prefixes and truncated payloads', async () => {
    expect(await decodeDesign('')).toBeNull()
    expect(await decodeDesign('v1.!!!notbase64')).toBeNull()
    expect(await decodeDesign('v9.abc')).toBeNull()
    const good = await encodeDesign(TEMPLATES[0].build())
    expect(await decodeDesign(good.slice(0, good.length / 2))).toBeNull()
  })

  it('drops malformed items instead of crashing', async () => {
    const d = TEMPLATES[0].build()
    const bad: Design = JSON.parse(JSON.stringify(d))
    bad.floors[0].furniture.push({ ...bad.floors[0].furniture[0], id: 'x', kind: 'spaceship' as never })
    bad.floors[0].walls.push({ ...bad.floors[0].walls[0], id: 'y', a: { x: NaN, y: 0 } })
    const decoded = await decodeDesign(await encodeDesign(bad))
    expect(decoded!.floors[0].furniture).toHaveLength(d.floors[0].furniture.length)
    expect(decoded!.floors[0].walls).toHaveLength(d.floors[0].walls.length)
  })
})

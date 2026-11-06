import { describe, it, expect } from 'vitest'
import { MODEL_TINT } from './modelTint'

const models = import.meta.glob<string>('../../public/models/*.gltf', { query: '?raw', import: 'default', eager: true })

// The tint table names glTF materials; a renamed material in the generator
// would silently stop the colour picker working in 3D.
describe('MODEL_TINT', () => {
  for (const [kind, names] of Object.entries(MODEL_TINT)) {
    it(`${kind}: every tinted material exists in its model`, () => {
      const raw = models[`../../public/models/${kind}.gltf`]
      expect(raw, `missing ${kind}.gltf`).toBeTruthy()
      const have = new Set((JSON.parse(raw).materials as { name: string }[]).map(m => m.name))
      for (const n of names!) expect(have, `${kind}.gltf has no material "${n}"`).toContain(n)
    })
  }
})

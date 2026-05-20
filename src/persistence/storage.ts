import { nanoid } from 'nanoid'
import type { Design } from '../store/types'

const KEY = 'homedesigner_v1'
export const CURRENT_VERSION = 2

// Migrates any older persisted shape to the current Design (v2 = floors[]).
export function migrate(raw: unknown): Design | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  // v1: { version:1, walls, openings, furniture } -> wrap in a single floor
  if (obj.version === 1) {
    return {
      version: CURRENT_VERSION,
      floors: [
        {
          id: nanoid(),
          name: 'Ground Floor',
          height: 280,
          walls: (obj.walls as Design['floors'][0]['walls']) ?? [],
          openings: (obj.openings as Design['floors'][0]['openings']) ?? [],
          furniture: (obj.furniture as Design['floors'][0]['furniture']) ?? [],
        },
      ],
    }
  }

  if (obj.version === CURRENT_VERSION && Array.isArray(obj.floors) && obj.floors.length > 0) {
    return obj as unknown as Design
  }

  return null
}

export function saveDesign(design: Design): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(design))
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function loadDesign(): Design | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return migrate(JSON.parse(raw))
  } catch {
    return null
  }
}

export function exportJSON(design: Design): void {
  const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'homedesign.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importJSON(): Promise<Design | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try {
        const text = await file.text()
        resolve(migrate(JSON.parse(text)))
      } catch {
        resolve(null)
      }
    }
    input.click()
  })
}

import type { Design } from '../store/types'

const KEY = 'homedesigner_v1'

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
    const parsed = JSON.parse(raw) as Design
    if (parsed.version !== 1) return null
    return parsed
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
        const parsed = JSON.parse(text) as Design
        resolve(parsed)
      } catch {
        resolve(null)
      }
    }
    input.click()
  })
}

import * as THREE from 'three'
import type { FloorMaterial } from '../store/types'
import { FLOOR_MATERIALS } from '../geometry/catalog'

// Procedural floor finishes, drawn once per material on a small canvas. Room
// floor geometry has UVs in metres, so one texture tile covers 1 m × 1 m.

const SIZE = 256
const cache = new Map<FloorMaterial, THREE.Texture>()

/** Deterministic PRNG so finishes look the same on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)))
  return `#${c.getHexString()}`
}

function drawWood(g: CanvasRenderingContext2D, base: string, r: () => number) {
  const planks = 5 // 20 cm boards
  const ph = SIZE / planks
  for (let i = 0; i < planks; i++) {
    const y = i * ph
    // Each row is two boards with a staggered end joint.
    const joint = (0.25 + r() * 0.5) * SIZE
    for (const [x0, x1] of [[0, joint], [joint, SIZE]]) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.12)
      g.fillRect(x0, y, x1 - x0, ph)
      // Grain: faint wavy lines along the board
      g.strokeStyle = shade(base, -0.12)
      g.globalAlpha = 0.25
      g.lineWidth = 1
      for (let k = 0; k < 6; k++) {
        const gy = y + 4 + r() * (ph - 8)
        const amp = 1 + r() * 2, freq = 0.02 + r() * 0.03, phase = r() * 6
        g.beginPath()
        for (let x = x0; x <= x1; x += 4) {
          const yy = gy + Math.sin(x * freq + phase) * amp
          if (x === x0) g.moveTo(x, yy)
          else g.lineTo(x, yy)
        }
        g.stroke()
      }
      g.globalAlpha = 1
    }
    g.fillStyle = shade(base, -0.22)
    g.fillRect(joint, y, 1.5, ph) // end joint
    g.fillRect(0, y, SIZE, 1.5) // board seam
  }
}

function drawTile(g: CanvasRenderingContext2D, base: string, r: () => number) {
  const n = 2 // 50 cm tiles
  const t = SIZE / n
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.05)
      g.fillRect(i * t, j * t, t, t)
    }
  }
  g.fillStyle = shade(base, -0.18)
  for (let i = 0; i < n; i++) {
    g.fillRect(i * t, 0, 2, SIZE)
    g.fillRect(0, i * t, SIZE, 2)
  }
}

function drawSpeckle(g: CanvasRenderingContext2D, base: string, r: () => number, count: number, spread: number, size: number) {
  g.fillStyle = base
  g.fillRect(0, 0, SIZE, SIZE)
  for (let i = 0; i < count; i++) {
    g.fillStyle = shade(base, (r() - 0.5) * spread)
    g.globalAlpha = 0.5
    g.fillRect(r() * SIZE, r() * SIZE, size, size)
  }
  g.globalAlpha = 1
}

function drawConcrete(g: CanvasRenderingContext2D, base: string, r: () => number) {
  drawSpeckle(g, base, r, 2600, 0.16, 1.5)
  // A few soft blotches
  for (let i = 0; i < 10; i++) {
    const x = r() * SIZE, y = r() * SIZE, rad = 20 + r() * 50
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, shade(base, (r() - 0.5) * 0.08))
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
}

function drawMarble(g: CanvasRenderingContext2D, base: string, r: () => number) {
  drawSpeckle(g, base, r, 600, 0.05, 2)
  g.strokeStyle = shade(base, -0.3)
  for (let v = 0; v < 5; v++) {
    g.globalAlpha = 0.18 + r() * 0.2
    g.lineWidth = 0.6 + r() * 1.4
    let x = r() * SIZE, y = 0
    g.beginPath()
    g.moveTo(x, y)
    while (y < SIZE) {
      x += (r() - 0.5) * 22
      y += 6 + r() * 10
      g.lineTo(x, y)
    }
    g.stroke()
  }
  g.globalAlpha = 1
}

/** A tiling texture for the finish, or null where there's no canvas (tests). */
export function floorTexture(material: FloorMaterial): THREE.Texture | null {
  const hit = cache.get(material)
  if (hit) return hit
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const g = canvas.getContext('2d')
  if (!g) return null
  const base = FLOOR_MATERIALS[material].color
  const r = rng(material.length * 7919 + material.charCodeAt(0))
  switch (material) {
    case 'wood': drawWood(g, base, r); break
    case 'tile': drawTile(g, base, r); break
    case 'carpet': drawSpeckle(g, base, r, 9000, 0.22, 1); break
    case 'concrete': drawConcrete(g, base, r); break
    case 'marble': drawMarble(g, base, r); break
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  cache.set(material, tex)
  return tex
}

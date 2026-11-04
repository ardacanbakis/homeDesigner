import type { Floor, Units } from '../store/types'
import { CATALOG_MAP } from '../geometry/catalog'
import { deriveRooms, classifyRoom, roomHue, roomLabelPoint, pointInPolygon, doorSwingSide, doorSwingBoxes } from '../geometry/rooms'
import { wallLength } from '../geometry/walls'
import { formatLength, formatArea, footprintAABB, CM_PER_FOOT } from '../geometry/measure'

// Printable 2D floor plan as a standalone SVG string (1 user unit = 1 cm).
// Pure and DOM-free so it can be tested and rendered anywhere; the browser
// helpers below turn it into a PNG, an .svg download or a print/PDF job.

const INK = '#1f2937'
const MUTED = '#64748b'
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'

const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const n1 = (v: number) => (Math.round(v * 10) / 10).toString()
const pts = (ps: { x: number; y: number }[]) => ps.map(p => `${n1(p.x)},${n1(p.y)}`).join(' ')

/** HSL (s, l in 0..1) → #rrggbb, so fills work in any SVG renderer. */
function hslHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}

/** Text that stays upright when laid along an angle (degrees). */
function upright(deg: number): number {
  return deg > 90 ? deg - 180 : deg < -90 ? deg + 180 : deg
}

export function planToSVG(floor: Floor, opts: { units: Units; title: string; date?: string }): string {
  const { units } = opts
  const out: string[] = []

  // ── Bounds: walls (outer faces) for dimensions, + furniture for the frame ──
  let wx0 = Infinity, wy0 = Infinity, wx1 = -Infinity, wy1 = -Infinity
  for (const w of floor.walls) {
    const t = w.thickness / 2
    wx0 = Math.min(wx0, w.a.x - t, w.b.x - t); wx1 = Math.max(wx1, w.a.x + t, w.b.x + t)
    wy0 = Math.min(wy0, w.a.y - t, w.b.y - t); wy1 = Math.max(wy1, w.a.y + t, w.b.y + t)
  }
  let x0 = wx0, y0 = wy0, x1 = wx1, y1 = wy1
  for (const f of floor.furniture) {
    const b = footprintAABB(f)
    x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1)
  }
  if (!Number.isFinite(x0)) { x0 = 0; y0 = 0; x1 = 400; y1 = 300 }

  const PAD_L = 130, PAD_T = 130, PAD_R = 70, TITLE_H = 210
  const vx = x0 - PAD_L, vy = y0 - PAD_T
  const vw = Math.max(720, x1 - x0 + PAD_L + PAD_R)
  const vh = y1 - y0 + PAD_T + TITLE_H
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const rooms = deriveRooms(floor.walls)
  for (const r of rooms) {
    out.push(`<polygon points="${pts(r.vertices)}" fill="${hslHex(roomHue(r.id), 0.55, 0.62)}" fill-opacity="0.18"/>`)
  }

  // ── Furniture (under walls, labels upright) ─────────────────────────────────
  for (const f of floor.furniture) {
    const cat = CATALOG_MAP[f.kind]
    const fcx = f.position.x + f.size.w / 2, fcy = f.position.y + f.size.d / 2
    const deg = (f.rotation * 180) / Math.PI
    out.push(
      `<g transform="translate(${n1(fcx)} ${n1(fcy)}) rotate(${n1(deg)})">` +
      `<rect x="${n1(-f.size.w / 2)}" y="${n1(-f.size.d / 2)}" width="${n1(f.size.w)}" height="${n1(f.size.d)}" rx="4" ` +
      `fill="${esc(f.color ?? cat.color)}" fill-opacity="0.35" stroke="${MUTED}" stroke-width="1.5"/></g>`,
    )
    const b = footprintAABB(f)
    const short = Math.min(b.x1 - b.x0, b.y1 - b.y0)
    if (short >= 28) {
      const label = f.kind === 'custom' ? (f.customLabel || cat.label) : cat.label
      const fs = Math.max(7, Math.min(13, (b.x1 - b.x0) / 7))
      out.push(`<text x="${n1(fcx)}" y="${n1(fcy)}" font-size="${n1(fs)}" fill="#334155" text-anchor="middle" dominant-baseline="central">${esc(label)}</text>`)
    }
  }

  // ── Walls with real gaps for openings, then door/window symbols ────────────
  for (const w of floor.walls) {
    const len = wallLength(w)
    if (len < 0.5) continue
    const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len
    const nx = uy, ny = -ux // left-hand normal (matches the editor's door side)
    const t = w.thickness / 2
    const at = (s: number, o = 0) => ({ x: w.a.x + ux * s + nx * o, y: w.a.y + uy * s + ny * o })
    const slab = (s: number, e: number) => [at(s, t), at(e, t), at(e, -t), at(s, -t)]

    const cuts = floor.openings.filter(o => o.wallId === w.id)
      .map(o => [Math.max(0, o.offset), Math.min(len, o.offset + o.width)] as const)
      .sort((p, q) => p[0] - q[0])
    let s = 0
    const solid: [number, number][] = []
    for (const [c0, c1] of cuts) { if (c0 > s) solid.push([s, c0]); s = Math.max(s, c1) }
    if (s < len) solid.push([s, len])
    for (const [a, b] of solid) {
      // Extend pieces that reach a wall end by half the thickness so corners close.
      out.push(`<polygon points="${pts(slab(a === 0 ? -t : a, b === len ? len + t : b))}" fill="${INK}"/>`)
    }

    for (const o of floor.openings.filter(op => op.wallId === w.id)) {
      const o0 = Math.max(0, o.offset), o1 = Math.min(len, o.offset + o.width), ow = o1 - o0
      if (ow <= 0) continue
      if (o.type === 'door') {
        const swing = doorSwingSide(w, o, floor.walls, rooms)
        // Leaf drawn open at 90° on the swing side; arc sweeps back to the far jamb.
        const H = at(o0), L = at(o0, swing * ow), J = at(o1)
        out.push(`<line x1="${n1(H.x)}" y1="${n1(H.y)}" x2="${n1(L.x)}" y2="${n1(L.y)}" stroke="${INK}" stroke-width="2.5"/>`)
        out.push(`<path d="M ${n1(L.x)} ${n1(L.y)} A ${n1(ow)} ${n1(ow)} 0 0 ${swing > 0 ? 1 : 0} ${n1(J.x)} ${n1(J.y)}" fill="none" stroke="${MUTED}" stroke-width="1.2" stroke-dasharray="5 4"/>`)
      } else {
        out.push(`<polygon points="${pts(slab(o0, o1))}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>`)
        const p = at(o0), q = at(o1)
        out.push(`<line x1="${n1(p.x)}" y1="${n1(p.y)}" x2="${n1(q.x)}" y2="${n1(q.y)}" stroke="${INK}" stroke-width="1.2"/>`)
      }
    }

    // Length of exterior walls only (interior partitions would float inside
    // rooms): a wall is exterior when its outward side isn't inside any room.
    const mid = at(len / 2)
    const side = Math.sign(nx * (mid.x - cx) + ny * (mid.y - cy)) || 1
    const outside = at(len / 2, side * (t + 30))
    if (len >= 80 && !rooms.some(r => pointInPolygon(outside, r.vertices))) {
      const p = at(len / 2, side * (t + 13))
      const deg = upright((Math.atan2(uy, ux) * 180) / Math.PI)
      out.push(`<text x="${n1(p.x)}" y="${n1(p.y)}" font-size="11" fill="${MUTED}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n1(deg)} ${n1(p.x)} ${n1(p.y)})">${esc(formatLength(len, units))}</text>`)
    }
  }

  // ── Room labels on top ─────────────────────────────────────────────────────
  let totalArea = 0
  const swings = doorSwingBoxes(floor.walls, floor.openings, rooms)
  for (const r of rooms) {
    totalArea += r.area
    const c = roomLabelPoint(r, floor.furniture, 120, 44, swings)
    out.push(`<text x="${n1(c.x)}" y="${n1(c.y - 9)}" font-size="16" font-weight="700" fill="#0f172a" text-anchor="middle" dominant-baseline="central">${esc(classifyRoom(r, floor.furniture))}</text>`)
    out.push(`<text x="${n1(c.x)}" y="${n1(c.y + 11)}" font-size="12" fill="#475569" text-anchor="middle" dominant-baseline="central">${esc(formatArea(r.area, units))}</text>`)
  }

  // ── Overall exterior dimensions (top + left) ───────────────────────────────
  if (Number.isFinite(wx0)) {
    const tick = (x: number, y: number) => `<line x1="${n1(x - 7)}" y1="${n1(y + 7)}" x2="${n1(x + 7)}" y2="${n1(y - 7)}" stroke="${INK}" stroke-width="1.5"/>`
    const ext = (xa: number, ya: number, xb: number, yb: number) => `<line x1="${n1(xa)}" y1="${n1(ya)}" x2="${n1(xb)}" y2="${n1(yb)}" stroke="${MUTED}" stroke-width="0.8"/>`
    const ty = wy0 - 60, lx = wx0 - 60
    out.push(ext(wx0, wy0 - 8, wx0, ty - 10), ext(wx1, wy0 - 8, wx1, ty - 10))
    out.push(`<line x1="${n1(wx0)}" y1="${n1(ty)}" x2="${n1(wx1)}" y2="${n1(ty)}" stroke="${INK}" stroke-width="1.2"/>`, tick(wx0, ty), tick(wx1, ty))
    out.push(`<text x="${n1((wx0 + wx1) / 2)}" y="${n1(ty - 14)}" font-size="14" font-weight="600" fill="${INK}" text-anchor="middle">${esc(formatLength(wx1 - wx0, units))}</text>`)
    out.push(ext(wx0 - 8, wy0, lx - 10, wy0), ext(wx0 - 8, wy1, lx - 10, wy1))
    out.push(`<line x1="${n1(lx)}" y1="${n1(wy0)}" x2="${n1(lx)}" y2="${n1(wy1)}" stroke="${INK}" stroke-width="1.2"/>`, tick(lx, wy0), tick(lx, wy1))
    const my = (wy0 + wy1) / 2
    out.push(`<text x="${n1(lx - 14)}" y="${n1(my)}" font-size="14" font-weight="600" fill="${INK}" text-anchor="middle" transform="rotate(-90 ${n1(lx - 14)} ${n1(my)})">${esc(formatLength(wy1 - wy0, units))}</text>`)
  }

  // ── Title block + scale bar ────────────────────────────────────────────────
  const sepY = y1 + 70
  const left = vx + 40, right = vx + vw - 40
  out.push(`<line x1="${n1(left)}" y1="${n1(sepY)}" x2="${n1(right)}" y2="${n1(sepY)}" stroke="#cbd5e1" stroke-width="1.5"/>`)
  out.push(`<text x="${n1(left)}" y="${n1(sepY + 46)}" font-size="26" font-weight="800" fill="#0f172a">${esc(opts.title)}</text>`)
  const facts = floor.name && floor.name !== opts.title ? [floor.name] : []
  facts.push(`${rooms.length} room${rooms.length === 1 ? '' : 's'}`)
  if (totalArea > 0) facts.push(formatArea(totalArea, units))
  if (opts.date) facts.push(opts.date)
  out.push(`<text x="${n1(left)}" y="${n1(sepY + 76)}" font-size="14" fill="#475569">${esc(facts.join('  ·  '))}</text>`)
  out.push(`<text x="${n1(left)}" y="${n1(sepY + 104)}" font-size="11" fill="#94a3b8">Drawn with HomeDesigner · overall dimensions to outer wall faces, wall lengths along centrelines</text>`)

  const imperial = units === 'ftin'
  const seg = imperial ? 2 * CM_PER_FOOT : 100 // 2 ft or 1 m per segment
  const segs = imperial ? 3 : 2
  const barX = right - seg * segs, barY = sepY + 40
  for (let i = 0; i < segs; i++) {
    out.push(`<rect x="${n1(barX + i * seg)}" y="${n1(barY)}" width="${n1(seg)}" height="10" fill="${i % 2 ? '#ffffff' : INK}" stroke="${INK}" stroke-width="1.2"/>`)
  }
  for (let i = 0; i <= segs; i++) {
    const label = imperial ? `${i * 2} ft` : `${i} m`
    out.push(`<text x="${n1(barX + i * seg)}" y="${n1(barY + 30)}" font-size="12" fill="#475569" text-anchor="middle">${label}</text>`)
  }

  const W = Math.round(vw * 1.25), H = Math.round(vh * 1.25)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${n1(vx)} ${n1(vy)} ${n1(vw)} ${n1(vh)}" font-family="${FONT}">` +
    `<rect x="${n1(vx)}" y="${n1(vy)}" width="${n1(vw)}" height="${n1(vh)}" fill="#ffffff"/>` +
    out.join('') +
    `</svg>`
  )
}

// ── Browser helpers ───────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadSVG(svg: string, filename: string) {
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}

/** Rasterize the plan SVG (white background) and download it as a PNG. */
export async function downloadPNG(svg: string, filename: string, widthPx = 2400) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = widthPx
    canvas.height = Math.round(widthPx * (img.naturalHeight / img.naturalWidth))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
    if (blob) downloadBlob(blob, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Open the browser print dialog (which also offers "Save as PDF") for the plan. */
export function printSVG(svg: string, title: string) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.srcdoc =
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
    `<style>@page{margin:12mm}html,body{margin:0}svg{display:block;width:100%;height:auto;max-height:100vh}</style>` +
    `</head><body>${svg}</body></html>`
  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) return frame.remove()
    win.onafterprint = () => frame.remove()
    win.focus()
    win.print()
    setTimeout(() => frame.isConnected && frame.remove(), 60_000)
  }
  document.body.appendChild(frame)
}

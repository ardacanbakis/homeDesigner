import { nanoid } from 'nanoid'
import type { Design, Floor, RoomTag } from '../store/types'
import { migrate } from './storage'
import { CATALOG_MAP, FLOOR_MATERIALS } from '../geometry/catalog'

// Shareable links: the design is compacted (short ids, rounded numbers),
// deflated with the native CompressionStream and base64url-encoded into the
// URL hash, so it never reaches a server. Format: #d=v1.<payload>

const PREFIX = 'v1.'
const HASH_KEY = 'd'
const MAX_PAYLOAD_CHARS = 400_000
const MAX_JSON_BYTES = 5_000_000 // guards against decompression bombs

const r1 = (n: number) => Math.round(n * 10) / 10
const r4 = (n: number) => Math.round(n * 1e4) / 1e4

/** Map every id through `mint`, keeping wallId references consistent. */
function remapIds(design: Design, mint: () => string): Design {
  const ids = new Map<string, string>()
  const id = (old: string) => {
    if (!ids.has(old)) ids.set(old, mint())
    return ids.get(old)!
  }
  return {
    version: design.version,
    floors: design.floors.map(f => ({
      id: id(f.id),
      name: f.name,
      height: f.height,
      walls: f.walls.map(w => ({ ...w, id: id(w.id) })),
      openings: f.openings.map(o => ({ ...o, id: id(o.id), wallId: id(o.wallId) })),
      furniture: f.furniture.map(x => ({ ...x, id: id(x.id) })),
      ...(f.roomTags?.length ? { roomTags: f.roomTags.map(t => ({ ...t, id: id(t.id) })) } : {}),
    })),
  }
}

/** Short ids + rounded numbers (0.1 cm, 1e-4 rad) to keep links short. */
function compact(design: Design): Design {
  let n = 0
  const d = remapIds(design, () => (n++).toString(36))
  return {
    version: d.version,
    floors: d.floors.map(f => ({
      ...f,
      height: r1(f.height),
      walls: f.walls.map(w => ({
        ...w, a: { x: r1(w.a.x), y: r1(w.a.y) }, b: { x: r1(w.b.x), y: r1(w.b.y) },
        thickness: r1(w.thickness), height: r1(w.height),
      })),
      openings: f.openings.map(o => ({
        ...o, offset: r1(o.offset), width: r1(o.width), height: r1(o.height), sillHeight: r1(o.sillHeight),
      })),
      furniture: f.furniture.map(x => ({
        ...x, position: { x: r1(x.position.x), y: r1(x.position.y) }, rotation: r4(x.rotation),
        size: { w: r1(x.size.w), d: r1(x.size.d), h: r1(x.size.h) },
      })),
      ...(f.roomTags ? { roomTags: f.roomTags.map(t => ({ ...t, at: { x: r1(t.at.x), y: r1(t.at.y) } })) } : {}),
    })),
  }
}

const finite = (...ns: unknown[]) => ns.every(n => typeof n === 'number' && Number.isFinite(n))

const isHexColor = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)

function sanitizeTags(tags: RoomTag[]): RoomTag[] {
  const out: RoomTag[] = []
  for (const t of tags) {
    if (!t || !t.at || !finite(t.at.x, t.at.y)) continue
    const tag: RoomTag = { id: String(t.id), at: { x: t.at.x, y: t.at.y } }
    if (typeof t.name === 'string' && t.name.trim()) tag.name = t.name.slice(0, 40)
    if (typeof t.material === 'string' && t.material in FLOOR_MATERIALS) tag.material = t.material
    if (isHexColor(t.paint)) tag.paint = t.paint
    if (tag.name || tag.material || tag.paint) out.push(tag)
  }
  return out
}

/** Drop anything malformed so a damaged or hand-edited link can't crash the editor. */
function sanitize(design: Design): Design | null {
  const floors: Floor[] = []
  for (const f of design.floors) {
    if (!f || !Array.isArray(f.walls) || !Array.isArray(f.openings) || !Array.isArray(f.furniture)) continue
    const walls = f.walls.filter(w => w && w.a && w.b && finite(w.a.x, w.a.y, w.b.x, w.b.y, w.thickness, w.height))
    const wallIds = new Set(walls.map(w => w.id))
    floors.push({
      id: String(f.id),
      name: typeof f.name === 'string' ? f.name.slice(0, 60) : 'Floor',
      height: finite(f.height) ? f.height : 280,
      walls,
      openings: f.openings.filter(o => o && wallIds.has(o.wallId) && (o.type === 'door' || o.type === 'window')
        && finite(o.offset, o.width, o.height, o.sillHeight)),
      furniture: f.furniture.filter(x => x && x.kind in CATALOG_MAP && x.position && x.size
        && finite(x.position.x, x.position.y, x.rotation, x.size.w, x.size.d, x.size.h))
        .map(x => {
          const out = { ...x }
          if (out.customLabel !== undefined) out.customLabel = String(out.customLabel).slice(0, 32)
          if (out.color !== undefined && !isHexColor(out.color)) delete out.color
          return out
        }),
      ...(Array.isArray(f.roomTags) ? { roomTags: sanitizeTags(f.roomTags) } : {}),
    })
  }
  return floors.length ? { version: design.version, floors } : null
}

// ── bytes ↔ base64url ──────────────────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_JSON_BYTES) { await reader.cancel(); throw new Error('share payload too large') }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

// ── public API ────────────────────────────────────────────────────────────────

export async function encodeDesign(design: Design): Promise<string> {
  const json = JSON.stringify(compact(design))
  return PREFIX + toBase64Url(await deflate(new TextEncoder().encode(json)))
}

/** Decode a share payload into a fresh Design (new ids), or null if invalid. */
export async function decodeDesign(payload: string): Promise<Design | null> {
  try {
    if (!payload.startsWith(PREFIX) || payload.length > MAX_PAYLOAD_CHARS) return null
    const json = new TextDecoder().decode(await inflate(fromBase64Url(payload.slice(PREFIX.length))))
    const migrated = migrate(JSON.parse(json))
    const clean = migrated && sanitize(migrated)
    return clean ? remapIds(clean, () => nanoid()) : null
  } catch {
    return null
  }
}

export async function shareUrl(design: Design): Promise<string> {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${HASH_KEY}=${await encodeDesign(design)}`
}

/** Share payload from the current URL hash, if any. */
export function readShareHash(): string | null {
  const m = window.location.hash.match(new RegExp(`^#${HASH_KEY}=(.+)$`))
  return m ? m[1] : null
}

/** Drop the share payload from the URL so a refresh doesn't re-import it. */
export function clearShareHash() {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

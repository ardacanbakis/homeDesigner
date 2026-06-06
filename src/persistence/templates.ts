import { nanoid } from 'nanoid'
import type { Design } from '../store/types'
import { Plan } from './layout'

// ─── Hero presets ─────────────────────────────────────────────────────────────
// All built with the declarative layout engine: furniture is anchored to walls
// with real clearances (≈90 cm walkways, kitchen work-triangle), never floating
// or overlapping. Each is visually verified.

const B = Plan.box

/** Studio — open-plan living/sleeping with a corner bathroom. ~5.4 × 4.0 m */
function studio(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 540, 400)
  const bvx = 350, bhy = 235
  p.partition(bvx, bhy, bvx, 400)
  const ph = p.partition(bvx, bhy, 540, bhy)
  p.doorAt(o.s, 0.22, 100)
  p.doorAt(ph, 0.5, 75)
  p.winAt(o.n, 0.28); p.winAt(o.w, 0.45); p.winAt(o.s, 0.62)

  const top = B(0, 0, 540, bhy)
  const lowL = B(0, bhy, bvx, 400)
  const bath = B(bvx, bhy, 540, 400)

  // Sleeping (NW) + wardrobe along the north wall
  p.corner('bed', top, 'NW', { w: 150, d: 200 })
  p.place('wardrobe', top, 'N', { w: 100, d: 58, align: 0.38 })
  // Kitchen counter run along the north wall, right side (work triangle)
  p.row(['fridge', 'stove', 'sink'], B(300, 0, 540, bhy), 'N', { margin: 8, gap: 6, sizes: { fridge: { w: 60, d: 60 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  // Living (lower-left)
  p.place('sofa', lowL, 'S', { w: 200, d: 88, align: 0.55 })
  p.at('table', 165, bhy + 22, { w: 90, d: 48 })
  p.place('tv', lowL, 'W', { w: 16, d: 110, align: 0.3 })
  // Bathroom
  p.corner('toilet', bath, 'NW', { w: 40, d: 68 })
  p.place('sink', bath, 'N', { w: 55, d: 42, align: 1 })
  p.place('bathtub', bath, 'S', { w: 160, d: 70, align: 0.5 })
  return p.toDesign('Studio')
}

/** 1-Bedroom — open living/kitchen, private bedroom + bathroom. ~6.4 × 4.4 m */
function oneBed(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 640, 440)
  const vDiv = p.partition(400, 0, 400, 440)
  const hDiv = p.partition(400, 250, 640, 250)
  p.doorAt(o.s, 0.25, 100)
  p.doorAt(vDiv, 0.12, 90)
  p.doorAt(hDiv, 0.18, 80)
  p.winAt(o.n, 0.22); p.winAt(o.n, 0.78); p.winAt(o.e, 0.35); p.winAt(o.s, 0.78)

  const bed = B(400, 0, 640, 250)
  const bath = B(400, 250, 640, 440)

  // Kitchen counter along the north wall
  p.row(['fridge', 'stove', 'sink'], B(0, 0, 400, 250), 'N', { margin: 14, gap: 6, sizes: { fridge: { w: 70, d: 62 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  // Living (lower portion): sofa on the west wall, TV facing it on the divider
  p.place('sofa', B(0, 210, 400, 440), 'W', { w: 88, d: 200, align: 0.5 })
  p.at('table', 200, 330, { w: 110, d: 60 })
  p.place('tv', B(0, 210, 400, 440), 'E', { w: 16, d: 120, align: 0.5 })
  // Bedroom: bed in the NE corner, wardrobe on the divider wall
  p.corner('bed', bed, 'NE', { w: 150, d: 200 })
  p.place('wardrobe', bed, 'W', { w: 58, d: 120, align: 0.5 })
  // Bathroom
  p.corner('toilet', bath, 'NW', { w: 40, d: 68 })
  p.place('sink', bath, 'N', { w: 55, d: 42, align: 1 })
  p.place('bathtub', bath, 'S', { w: 160, d: 70, align: 0.5 })
  return p.toDesign('1-Bedroom Apartment')
}

/** 2-Bedroom — living, kitchen-diner, bedroom, bathroom, home office. ~7.4 × 5.6 m */
function twoBed(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 740, 560)
  const hDiv = p.partition(0, 300, 740, 300)
  const vTop = p.partition(440, 0, 440, 300)
  const vB1 = p.partition(440, 300, 440, 560)
  const vB2 = p.partition(600, 300, 600, 560)
  p.doorAt(o.w, 0.7, 100)        // entrance into living
  p.doorAt(vTop, 0.78, 100)      // living ↔ kitchen
  p.doorAt(hDiv, 0.12, 90)       // → bedroom
  p.doorAt(vB1, 0.16, 80)        // → bathroom
  p.doorAt(vB2, 0.16, 80)        // → office
  p.winAt(o.n, 0.22); p.winAt(o.n, 0.75); p.winAt(o.e, 0.2); p.winAt(o.s, 0.18); p.winAt(o.s, 0.72)

  const living = B(0, 0, 440, 300)
  const kitchen = B(440, 0, 740, 300)
  const bedroom = B(0, 300, 440, 560)
  const bath = B(440, 300, 600, 560)
  const office = B(600, 300, 740, 560)

  // Living
  p.place('sofa', living, 'W', { w: 90, d: 210, align: 0.5 })
  p.place('tv', living, 'E', { w: 16, d: 120, align: 0.45 })
  p.at('table', 215, 150, { w: 110, d: 60 })
  p.corner('chair', living, 'SE', { w: 50, d: 50 })
  // Kitchen-diner: counter run on the north wall, dining set centered below
  p.row(['fridge', 'stove', 'sink'], kitchen, 'N', { margin: 14, gap: 6, sizes: { fridge: { w: 70, d: 62 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  p.at('table', 600, 215, { w: 120, d: 75 })
  p.chairsAround(600, 215, 120, 75, { top: 1, bottom: 1, left: 1, right: 1 })
  // Bedroom
  p.place('bed', bedroom, 'W', { w: 160, d: 200, align: 0.5 })
  p.place('wardrobe', bedroom, 'E', { w: 58, d: 120, align: 0.28 })
  p.place('dresser', bedroom, 'S', { w: 100, d: 50, align: 0.78 })
  // Bathroom
  p.corner('toilet', bath, 'NW', { w: 40, d: 68 })
  p.place('sink', bath, 'N', { w: 55, d: 42, align: 1 })
  p.place('bathtub', bath, 'E', { w: 70, d: 150, align: 0.5 })
  // Office
  p.place('desk', office, 'N', { w: 120, d: 60, align: 0.5 })
  p.at('chair', 670, 405, { w: 50, d: 50 })
  p.place('dresser', office, 'S', { w: 90, d: 45, align: 0.5 })
  return p.toDesign('2-Bedroom Apartment')
}

/** Family House — open living + kitchen-diner, two bedrooms, family bath. ~8.4 × 6.4 m */
function familyHouse(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 840, 640)
  const hDiv = p.partition(0, 340, 840, 340)
  const vTop = p.partition(480, 0, 480, 340)
  p.partition(300, 340, 300, 640)
  p.partition(560, 340, 560, 640)
  p.doorAt(o.w, 0.72, 100)
  p.doorAt(vTop, 0.78, 110)
  p.doorAt(hDiv, 0.12, 90)
  p.doorAt(hDiv, 0.52, 90)
  p.doorAt(hDiv, 0.84, 80)
  p.winAt(o.n, 0.2); p.winAt(o.n, 0.72); p.winAt(o.s, 0.18); p.winAt(o.s, 0.52); p.winAt(o.e, 0.2)

  const living = B(0, 0, 480, 340)
  const kitchen = B(480, 0, 840, 340)
  const master = B(0, 340, 300, 640)
  const bed2 = B(300, 340, 560, 640)
  const bath = B(560, 340, 840, 640)

  // Living
  p.place('sofa', living, 'W', { w: 95, d: 220, align: 0.5 })
  p.place('tv', living, 'E', { w: 16, d: 130, align: 0.45 })
  p.at('table', 250, 170, { w: 130, d: 65 })
  p.corner('chair', living, 'SW', { w: 52, d: 52 })
  // Kitchen-diner
  p.row(['fridge', 'stove', 'sink'], kitchen, 'N', { margin: 16, gap: 6, sizes: { fridge: { w: 70, d: 62 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  p.at('table', 660, 235, { w: 150, d: 85 })
  p.chairsAround(660, 235, 150, 85, { top: 2, bottom: 2 })
  // Master bedroom — bed on the north wall, wardrobe along the south
  p.place('bed', master, 'N', { w: 160, d: 200, align: 0.5 })
  p.place('wardrobe', master, 'S', { w: 140, d: 56, align: 0.5 })
  // Bedroom 2
  p.place('bed', bed2, 'S', { w: 140, d: 200, align: 0.35 })
  p.place('dresser', bed2, 'E', { w: 50, d: 100, align: 0.25 })
  p.place('desk', bed2, 'N', { w: 110, d: 55, align: 0.5 })
  // Family bath
  p.corner('toilet', bath, 'NW', { w: 40, d: 68 })
  p.place('sink', bath, 'N', { w: 60, d: 45, align: 0.55 })
  p.place('bathtub', bath, 'E', { w: 75, d: 170, align: 0.5 })
  return p.toDesign('Family House')
}

/** Office Suite — open desk pods, glass meeting room, reception & restroom. ~7.6 × 5.2 m */
function officeSuite(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 760, 520)
  // Meeting room — top-right
  const mv = p.partition(540, 0, 540, 240)
  p.partition(540, 240, 760, 240)
  // Restroom — bottom-left
  const rh = p.partition(0, 360, 220, 360)
  p.partition(220, 360, 220, 520)
  p.doorAt(o.w, 0.45, 110)       // main entrance
  p.doorAt(mv, 0.7, 90)          // into meeting room
  p.doorAt(rh, 0.6, 80)          // into restroom
  p.winAt(o.n, 0.25); p.winAt(o.n, 0.72); p.winAt(o.e, 0.3); p.winAt(o.s, 0.6)

  const rest = B(0, 360, 220, 520)

  // Open desk pods — a 2×2 cluster, each desk with its chair, kept clear of
  // the restroom (bottom-left) and meeting room (top-right).
  const deskW = 140, deskD = 64
  for (const cx of [300, 460]) for (const cy of [150, 330]) {
    p.at('desk', cx, cy, { w: deskW, d: deskD })
    p.at('chair', cx, cy + deskD / 2 + 34, { w: 46, d: 46 })
  }
  // Reception desk + waiting sofa near the entrance (west)
  p.place('desk', B(0, 30, 240, 200), 'W', { w: 70, d: 140, align: 0.5 })
  p.at('chair', 120, 115, { w: 48, d: 48 })
  p.place('sofa', B(0, 200, 220, 360), 'N', { w: 160, d: 72, align: 0.5 })
  // Meeting room — table with four chairs
  p.at('table', 650, 120, { w: 140, d: 84 })
  p.chairsAround(650, 120, 140, 84, { top: 2, bottom: 2 })
  // Restroom
  p.corner('toilet', rest, 'NW', { w: 40, d: 68 })
  p.place('sink', rest, 'N', { w: 55, d: 42, align: 1 })
  return p.toDesign('Office Suite')
}

// ─── Registry ────────────────────────────────────────────────────────────────

export type TemplateCategory = 'apartment' | 'house' | 'workspace' | 'custom'

export type TemplateMeta = {
  id: string
  name: string
  description: string
  category: TemplateCategory
  icon: string
  rooms: string
  build: () => Design
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; icon: string }[] = [
  { id: 'apartment', label: 'Apartments', icon: '🏢' },
  { id: 'house', label: 'Houses', icon: '🏡' },
  { id: 'workspace', label: 'Workspaces', icon: '🏬' },
  { id: 'custom', label: 'My Templates', icon: '⭐' },
]

export const TEMPLATES: TemplateMeta[] = [
  { id: 'studio',  name: 'Studio',              description: 'Open-plan living & sleeping with a private corner bathroom.',                 category: 'apartment', icon: '🛏️', rooms: 'Open plan · Bath', build: studio },
  { id: 'one-bed', name: '1-Bedroom Apartment', description: 'Open living/kitchen with a separate bedroom and full bathroom.',              category: 'apartment', icon: '🛋️', rooms: 'Living · Kitchen · Bed · Bath', build: oneBed },
  { id: 'two-bed', name: '2-Bedroom Apartment', description: 'A family flat: living room, kitchen-diner, bedroom, bathroom and home office.',category: 'apartment', icon: '🏠', rooms: 'Living · Kitchen · Bed · Bath · Office', build: twoBed },
  { id: 'family',  name: 'Family House',        description: 'Detached home with open living, kitchen-diner, two bedrooms and a family bath.', category: 'house',    icon: '🏡', rooms: 'Living · Kitchen · 2 Beds · Bath', build: familyHouse },
  { id: 'office',  name: 'Office Suite',        description: 'Reception, open desk pods, a meeting room and a restroom.',                   category: 'workspace', icon: '🖥️', rooms: 'Reception · Desks · Meeting · WC', build: officeSuite },
]

// ─── User templates (saved to localStorage) ───────────────────────────────────

const USER_TEMPLATES_KEY = 'homedesigner_user_templates_v1'

export type UserTemplate = {
  id: string
  name: string
  createdAt: number
  /** Serialized Design captured at save time. */
  design: Design
}

export function loadUserTemplates(): UserTemplate[] {
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

export function saveUserTemplate(name: string, design: Design): UserTemplate {
  const list = loadUserTemplates()
  const t: UserTemplate = { id: nanoid(), name, createdAt: Date.now(), design }
  list.unshift(t)
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(list))
  return t
}

export function deleteUserTemplate(id: string) {
  const next = loadUserTemplates().filter(t => t.id !== id)
  localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(next))
}

/** Backward-compatible default template (the 2-bedroom apartment). */
export function createTemplate(): Design {
  return twoBed()
}

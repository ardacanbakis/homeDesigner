import { nanoid } from 'nanoid'
import type { Design } from '../store/types'
import { Plan } from './layout'

// ─── Hero presets ─────────────────────────────────────────────────────────────
// Built with the declarative layout engine: pieces stand with their backs to a
// wall and face into the room, doors are placed by world coordinate, and every
// layout is gated by templates.test.ts — no overlaps, no wall clipping, and no
// furniture in a door's swing or blocking a doorway.

const B = Plan.box

/** Studio — open-plan living & sleeping, dining for two, private bathroom. ~5.4 × 4.0 m */
function studio(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 540, 400)
  p.partition(350, 235, 350, 400)
  const bathTop = p.partition(350, 235, 540, 235)
  p.door(o.s, 290, 90)        // front door into the living area
  p.door(bathTop, 400, 75)    // into the bathroom
  p.window(o.n, 110); p.window(o.n, 470, 100); p.window(o.w, 320, 100); p.window(o.s, 110, 120)

  const top = B(0, 0, 540, 235)
  const living = B(0, 235, 350, 400)
  const bath = B(350, 235, 540, 400)

  // Sleeping corner + wardrobe along the north wall
  p.corner('bed', top, 'NW', { w: 150, d: 200 })
  p.place('wardrobe', top, 'N', { w: 100, d: 58, align: 0.38 })
  // Kitchenette run (work triangle) on the north wall
  p.row(['fridge', 'stove', 'sink'], B(300, 0, 540, 235), 'N', { margin: 8, gap: 6, sizes: { fridge: { w: 60, d: 60 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  // Dining for two
  p.at('table', 290, 150, { w: 90, d: 60 })
  p.chairsAround(290, 150, 90, 60, { left: 1, right: 1 })
  // Lounge: sofa against the south wall facing the room, coffee table on a rug
  p.place('sofa', living, 'S', { w: 180, d: 85, align: 0 })
  p.at('rug', 104, 290, { w: 160, d: 110 })
  p.at('table', 104, 262, { w: 80, d: 44 })
  p.at('lamp', 222, 366, { w: 36, d: 36 })
  // Bathroom
  p.at('sink', 462, 269, { w: 44, d: 40 })
  p.corner('toilet', bath, 'NE', { w: 40, d: 60 })
  p.lengthwise('bathtub', bath, 'S', { w: 75, d: 160 })
  p.room(top, { material: 'wood', at: { x: 200, y: 200 } })
  p.room(bath, { material: 'tile' })
  return p.toDesign('Studio')
}

/** 1-Bedroom — open living/kitchen with dining, bedroom and bathroom. ~6.4 × 4.4 m */
function oneBed(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 640, 440)
  const div = p.partition(400, 0, 400, 440)
  p.partition(400, 270, 640, 270)
  p.door(o.w, 140, 100)       // front door into the living room
  p.door(div, 217, 75)        // → bedroom
  p.door(div, 395, 75)        // → bathroom
  p.window(o.n, 115, 100); p.window(o.n, 300, 100); p.window(o.n, 540, 100)
  p.window(o.e, 140, 120); p.window(o.s, 200, 140); p.window(o.w, 330, 100)

  const bedroom = B(400, 0, 640, 270)
  const bath = B(400, 270, 640, 440)

  // Kitchen run along the north wall + dining for two
  p.row(['fridge', 'stove', 'sink'], B(0, 0, 400, 270), 'N', { margin: 14, gap: 6, sizes: { fridge: { w: 70, d: 62 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  p.at('table', 300, 150, { w: 80, d: 60 })
  p.chairsAround(300, 150, 80, 60, { top: 1, bottom: 1 })
  // Living: sofa on the west wall facing the TV, which sits on the divider
  // between the bedroom and bathroom doorways
  p.place('sofa', B(0, 200, 400, 440), 'W', { w: 190, d: 85 })
  p.at('rug', 215, 320, { w: 180, d: 140 })
  p.at('table', 235, 320, { w: 100, d: 55 })
  p.at('tv', 378.5, 306, { w: 100, d: 15, back: 'E' })
  // Bedroom: bed with its headboard on the east wall, dresser opposite the door
  p.place('bed', bedroom, 'E', { w: 150, d: 200, align: 0 })
  p.at('nightstand', 606, 187, { w: 42, d: 40, back: 'E' })
  p.place('dresser', bedroom, 'S', { w: 90, d: 45, align: 1 })
  // Bathroom
  p.lengthwise('bathtub', bath, 'N', { w: 75, d: 150, align: 1 })
  p.corner('toilet', bath, 'SE', { w: 40, d: 65 })
  p.place('sink', bath, 'S', { w: 55, d: 42, align: 0.6 })
  p.room(B(0, 0, 400, 440), { material: 'wood' })
  p.room(bedroom, { material: 'carpet', paint: '#B3C1A4' })
  p.room(bath, { material: 'tile' })
  return p.toDesign('1-Bedroom Apartment')
}

/** 2-Bedroom — living, kitchen-diner, bedroom, bathroom and a home office. ~7.4 × 5.6 m */
function twoBed(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 740, 560)
  const hDiv = p.partition(0, 300, 740, 300)
  const vTop = p.partition(440, 0, 440, 300)
  const vBath = p.partition(440, 300, 440, 560)
  p.partition(600, 300, 600, 560)
  p.door(o.n, 311, 100)       // front door into the living room
  p.door(vTop, 230, 90)       // living ↔ kitchen
  p.door(hDiv, 290, 90)       // living → bedroom
  p.door(vBath, 510, 75)      // bedroom → bathroom
  p.door(hDiv, 670, 80)       // kitchen → office
  p.window(o.n, 130); p.window(o.n, 640); p.window(o.e, 150, 110); p.window(o.e, 430, 100)
  p.window(o.s, 150, 140); p.window(o.w, 150, 110); p.window(o.w, 430, 110)

  const living = B(0, 0, 440, 300)
  const kitchen = B(440, 0, 740, 300)
  const bedroom = B(0, 300, 440, 560)
  const bath = B(440, 300, 600, 560)
  const office = B(600, 300, 740, 560)

  // Living: sofa faces the TV across a coffee table
  p.place('sofa', living, 'W', { w: 200, d: 90 })
  p.place('tv', B(0, 0, 440, 180), 'E', { w: 110, d: 15 })
  p.at('rug', 205, 165, { w: 170, d: 120 })
  p.at('table', 230, 150, { w: 110, d: 60 })
  p.corner('plant', living, 'NW', { w: 34, d: 34 })
  p.place('bookshelf', living, 'S', { align: 0.1 })
  // Kitchen-diner
  p.row(['fridge', 'counter', 'stove', 'sink'], kitchen, 'N', { margin: 14, gap: 6, sizes: { fridge: { w: 70, d: 62 }, counter: { w: 60, d: 60 }, stove: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  p.at('table', 600, 190, { w: 110, d: 70 })
  p.chairsAround(600, 190, 110, 70, { top: 1, bottom: 1, right: 1 })
  // Bedroom
  p.place('bed', bedroom, 'W', { w: 160, d: 200 })
  p.at('nightstand', 32, 329, { w: 40, d: 36, back: 'W' })
  p.at('nightstand', 32, 531, { w: 40, d: 36, back: 'W' })
  p.place('wardrobe', bedroom, 'E', { w: 120, d: 58, align: 0 })
  p.place('dresser', bedroom, 'S', { w: 100, d: 50, align: 0.75 })
  // Bathroom
  p.corner('toilet', bath, 'NW', { w: 40, d: 70 })
  p.place('sink', bath, 'N', { w: 50, d: 42, align: 1 })
  p.lengthwise('bathtub', bath, 'E', { w: 70, d: 150, align: 0.55 })
  // Office: desk on the south wall, chair facing it
  p.place('desk', office, 'S', { w: 110, d: 60 })
  p.at('chair', 670, 460, { w: 46, d: 46 })
  p.place('bookshelf', office, 'W', { align: 0.5 })
  p.room(living, { material: 'wood' })
  p.room(kitchen, { material: 'tile' })
  p.room(bedroom, { material: 'wood', paint: '#AEC0CE' })
  p.room(bath, { material: 'marble' })
  p.room(office, { material: 'wood', paint: '#D5CBBE' })
  return p.toDesign('2-Bedroom Apartment')
}

/** Family House — open-plan living/kitchen/dining, two bedrooms, family bath. ~8.4 × 6.4 m */
function familyHouse(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 840, 640)
  const hall = p.partition(0, 340, 840, 340)
  p.partition(300, 340, 300, 640)
  p.partition(560, 340, 560, 640)
  p.door(o.n, 380, 100)       // front door into the open-plan space
  p.door(hall, 200, 90)       // → main bedroom
  p.door(hall, 400, 90)       // → bedroom 2
  p.door(hall, 640, 80)       // → bathroom
  p.window(o.n, 150, 150); p.window(o.n, 680, 140); p.window(o.e, 170, 120); p.window(o.e, 500, 100)
  p.window(o.s, 150, 140); p.window(o.s, 430, 120); p.window(o.w, 170, 130)

  const kitchen = B(480, 0, 840, 340)
  const bed2 = B(300, 340, 560, 640)
  const bath = B(560, 340, 840, 640)

  // Lounge: sofa on the west wall, TV unit facing it
  p.place('sofa', B(0, 0, 440, 340), 'W', { w: 220, d: 95, align: 0.4 })
  p.at('rug', 230, 175, { w: 190, d: 150 })
  p.at('table', 235, 160, { w: 120, d: 65 })
  p.at('tv', 400, 160, { w: 130, d: 15, back: 'E' })
  p.corner('plant', B(0, 0, 440, 340), 'NW', { w: 34, d: 34 })
  p.at('lamp', 34, 300, { w: 40, d: 40 })
  // Kitchen run + dining table for four
  p.row(['fridge', 'stove', 'counter', 'sink'], kitchen, 'N', { margin: 16, gap: 6, sizes: { fridge: { w: 70, d: 62 }, stove: { w: 60, d: 60 }, counter: { w: 60, d: 60 }, sink: { w: 60, d: 55 } } })
  p.at('table', 690, 185, { w: 150, d: 85 })
  p.chairsAround(690, 185, 150, 85, { top: 2, bottom: 2 })
  // Main bedroom
  p.at('bed', 114, 546, { w: 160, d: 200, back: 'W' })
  p.at('nightstand', 32, 444, { w: 40, d: 36, back: 'W' })
  p.place('wardrobe', B(0, 340, 150, 640), 'N', { w: 120, d: 58, align: 0 })
  // Bedroom 2: bed, dresser and a study desk
  p.place('bed', bed2, 'S', { w: 140, d: 200, align: 1 })
  p.at('nightstand', 384, 606, { w: 40, d: 40, back: 'S' })
  p.place('dresser', bed2, 'W', { w: 90, d: 45, align: 1 })
  p.at('desk', 341.5, 480, { w: 80, d: 55, back: 'W' })
  // Family bathroom
  p.corner('toilet', bath, 'NE', { w: 40, d: 68 })
  p.place('sink', bath, 'N', { w: 60, d: 45, align: 0.75 })
  p.lengthwise('bathtub', bath, 'S', { w: 80, d: 170 })
  p.at('shower', 619, 475, { w: 90, d: 90, back: 'W' })
  p.room(B(0, 0, 840, 340), { material: 'wood' })
  p.room(B(0, 340, 300, 640), { name: 'Main Bedroom', material: 'wood', paint: '#B3C1A4' })
  p.room(bed2, { name: 'Bedroom 2', material: 'carpet', paint: '#E4C3BC' })
  p.room(bath, { material: 'marble' })
  return p.toDesign('Family House')
}

/** Office Suite — reception, open desk pods, meeting room and restroom. ~7.6 × 5.2 m */
function officeSuite(): Design {
  const p = new Plan()
  const o = p.rect(0, 0, 760, 520)
  p.partition(520, 0, 520, 260)                // meeting room — top-right
  const meet = p.partition(520, 260, 760, 260)
  p.partition(0, 360, 220, 360)                // restroom — bottom-left
  const rest = p.partition(220, 360, 220, 520)
  p.door(o.s, 320, 110)       // main entrance
  p.door(meet, 565, 80)       // → meeting room
  p.door(rest, 450, 80)       // → restroom
  p.window(o.n, 150, 150); p.window(o.n, 640, 140); p.window(o.e, 130, 120)
  p.window(o.e, 400, 120); p.window(o.w, 200, 140); p.window(o.s, 600, 140)

  // Desk pods — a 2×2 cluster, each chair facing its desk
  for (const cx of [110, 290]) for (const cy of [80, 230]) {
    p.at('desk', cx, cy, { w: 140, d: 64 })
    p.at('chair', cx, cy + 58, { w: 46, d: 46, back: 'S' })
  }
  // Reception desk facing the entrance, waiting sofa by the east wall
  p.at('desk', 470, 360, { w: 140, d: 64 })
  p.at('chair', 470, 302, { w: 46, d: 46 })
  p.place('sofa', B(520, 260, 760, 520), 'E', { w: 160, d: 80, align: 0.6 })
  // Meeting room
  p.at('table', 660, 105, { w: 130, d: 80 })
  p.chairsAround(660, 105, 130, 80, { top: 2, bottom: 2 })
  p.corner('plant', B(520, 0, 760, 260), 'NW', { w: 40, d: 40 })
  p.corner('plant', B(0, 0, 520, 260), 'NE', { w: 40, d: 40 })
  // Restroom
  const wc = B(0, 360, 220, 520)
  p.corner('toilet', wc, 'NW', { w: 40, d: 68 })
  p.corner('sink', wc, 'SW', { w: 55, d: 42, back: 'W' })
  p.room(B(0, 0, 760, 520), { name: 'Open Office', material: 'concrete', at: { x: 380, y: 300 } })
  p.room(B(520, 0, 760, 260), { material: 'carpet', paint: '#AEC0CE' })
  p.room(wc, { name: 'Restroom', material: 'tile' })
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

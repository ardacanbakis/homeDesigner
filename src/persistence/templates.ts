import { nanoid } from 'nanoid'
import type { Design, Floor, Wall, Opening, Furniture, FurnitureKind } from '../store/types'
import { CURRENT_VERSION } from './storage'
import { CATALOG_MAP } from '../geometry/catalog'

// ─── Builder helpers ─────────────────────────────────────────────────────────

function w(ax: number, ay: number, bx: number, by: number): Wall {
  return { id: nanoid(), a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 260 }
}

/** Four outer walls of an axis-aligned rectangle, with consistent directions:
 *  n: left→right, e: top→bottom, s: right→left, w: bottom→top.
 *  Opening offsets are therefore measured from: n←x0, e←y0, s←x1, w←y1. */
function outer(x0: number, y0: number, x1: number, y1: number) {
  return {
    n: w(x0, y0, x1, y0),
    e: w(x1, y0, x1, y1),
    s: w(x1, y1, x0, y1),
    w: w(x0, y1, x0, y0),
  }
}

function door(wall: Wall, offset: number, width = 90, height = 210): Opening {
  return { id: nanoid(), wallId: wall.id, type: 'door', offset, width, height, sillHeight: 0 }
}

function win(wall: Wall, offset: number, width = 120, height = 120, sillHeight = 90): Opening {
  return { id: nanoid(), wallId: wall.id, type: 'window', offset, width, height, sillHeight }
}

type FOpts = { w?: number; d?: number; h?: number; rot?: number; color?: string }

/** Furniture at footprint top-left (x,y); size & color default to the catalog. */
function f(kind: FurnitureKind, x: number, y: number, o: FOpts = {}): Furniture {
  const c = CATALOG_MAP[kind]
  return {
    id: nanoid(),
    kind,
    position: { x, y },
    rotation: o.rot ?? 0,
    size: { w: o.w ?? c.size.w, d: o.d ?? c.size.d, h: o.h ?? c.size.h },
    color: o.color ?? c.color,
  }
}

function design(name: string, walls: Wall[], openings: Opening[], furniture: Furniture[]): Design {
  const floor: Floor = { id: nanoid(), name, height: 280, walls, openings, furniture }
  return { version: CURRENT_VERSION, floors: [floor] }
}

// ─── Templates ───────────────────────────────────────────────────────────────

/** Compact open-plan studio with a corner bathroom. ~5.0 × 3.6 m */
function studio(): Design {
  const o = outer(40, 40, 540, 400)
  // Bathroom carved into the top-right corner (360–540 × 40–180)
  const p1 = w(360, 40, 360, 180) // vertical partition, dir +y
  const p2 = w(360, 180, 540, 180) // horizontal partition, dir +x
  const walls = [o.n, o.e, o.s, o.w, p1, p2]

  const openings = [
    door(o.s, 300, 90),    // front entrance on south wall
    door(p2, 40, 70),      // bathroom door
    win(o.n, 180),         // north window over kitchen
    win(o.w, 120),         // west window
  ]

  const furniture = [
    // Sleeping
    f('bed', 60, 60, { w: 160, d: 200 }),
    f('wardrobe', 235, 60, { w: 120, d: 55 }),
    // Kitchenette along the bottom-left
    f('fridge', 60, 305),
    f('stove', 140, 310),
    f('sink', 210, 315),
    // Living
    f('sofa', 280, 300, { w: 200, d: 88 }),
    f('tv', 300, 195, { w: 130, d: 15 }),
    // Bathroom (corner)
    f('toilet', 372, 60),
    f('sink', 470, 60, { w: 60, d: 45 }),
  ]
  return design('Studio', walls, openings, furniture)
}

/** One-bedroom: open living/kitchen, separate bedroom + bathroom. ~6.0 × 4.2 m */
function oneBed(): Design {
  const o = outer(40, 40, 640, 460)
  const vDiv = w(420, 40, 420, 460)   // splits left (living/kitchen) | right column
  const hDiv = w(420, 280, 640, 280)  // right column → bedroom (top) / bath (bottom)
  const walls = [o.n, o.e, o.s, o.w, vDiv, hDiv]

  const openings = [
    door(o.s, 420, 90),    // front entrance (south, left area)
    door(vDiv, 120, 90),   // living → bedroom
    door(hDiv, 90, 80),    // bedroom → bathroom
    win(o.n, 120),         // living window
    win(o.n, 520, 120),    // kitchen window
    win(o.s, 460, 120),    // bedroom window (south, right)
  ]

  const furniture = [
    // Kitchen — top-left under north wall
    f('fridge', 60, 60),
    f('stove', 140, 60),
    f('sink', 210, 60, { w: 60, d: 50 }),
    // Living — lower-left
    f('sofa', 70, 320, { w: 200, d: 90 }),
    f('table', 110, 200, { w: 120, d: 70 }),
    f('tv', 70, 150, { w: 130, d: 15 }),
    f('chair', 300, 330),
    // Bedroom — top-right
    f('bed', 450, 70, { w: 160, d: 200 }),
    f('wardrobe', 450, 280 - 70, { w: 120, d: 55, rot: 0 }),
    // Bathroom — bottom-right
    f('toilet', 450, 300),
    f('bathtub', 520, 300, { w: 80, d: 150 }),
  ]
  return design('1-Bedroom Apartment', walls, openings, furniture)
}

/** Two-bedroom family apartment: living, kitchen, bedroom, bathroom, office. ~7.0 × 5.5 m */
function twoBed(): Design {
  const wN = w(50, 50, 750, 50)
  const wE = w(750, 50, 750, 600)
  const wS = w(750, 600, 50, 600)
  const wW = w(50, 600, 50, 50)
  const wH = w(50, 325, 750, 325)   // horizontal divider
  const wLK = w(450, 50, 450, 325)  // living / kitchen
  const wBB = w(450, 325, 450, 600) // bedroom / right divider
  const wBO = w(600, 325, 600, 600) // bathroom / office
  const walls = [wN, wE, wS, wW, wH, wLK, wBB, wBO]

  const openings: Opening[] = [
    door(wW, 380, 90),       // front entrance
    door(wLK, 55, 210),      // wide living↔kitchen opening
    door(wH, 75, 90),        // bedroom door
    door(wBB, 50, 80),       // bathroom door
    door(wBO, 30, 75),       // office door
    win(wN, 70, 150),
    win(wN, 500, 130),
    win(wE, 80, 120),
    win(wS, 330, 150),
  ]

  const furniture: Furniture[] = [
    // Living
    f('tv', 182, 68, { w: 130, d: 15 }),
    f('sofa', 130, 218, { w: 200, d: 90 }),
    f('table', 200, 153, { w: 110, d: 60, h: 45 }),
    f('chair', 355, 195),
    // Kitchen
    f('fridge', 668, 65),
    f('stove', 672, 155),
    f('sink', 673, 238),
    f('table', 478, 148, { w: 120, d: 70 }),
    f('chair', 493, 105),
    f('chair', 493, 233, { rot: Math.PI }),
    // Bedroom
    f('bed', 90, 362, { w: 160, d: 200 }),
    f('wardrobe', 320, 340, { w: 120, d: 60 }),
    f('dresser', 320, 430),
    // Bathroom
    f('toilet', 460, 342),
    f('bathtub', 455, 428, { w: 80, d: 155 }),
    // Office
    f('desk', 608, 342, { w: 130, d: 65 }),
    f('chair', 648, 423, { rot: Math.PI }),
  ]
  return design('2-Bedroom Apartment', walls, openings, furniture)
}

/** Detached family house: living + kitchen up top, two bedrooms + bath below. ~8.0 × 6.0 m */
function familyHouse(): Design {
  const o = outer(40, 40, 840, 640)
  const hDiv = w(40, 340, 840, 340)    // top floor-public / bottom-private
  const vTop = w(480, 40, 480, 340)    // living | kitchen
  const vBed1 = w(340, 340, 340, 640)  // master | bedroom 2
  const vBed2 = w(600, 340, 600, 640)  // bedroom 2 | bathroom
  const walls = [o.n, o.e, o.s, o.w, hDiv, vTop, vBed1, vBed2]

  const openings = [
    door(o.w, 480, 100),    // front entrance (west)
    door(vTop, 120, 100),   // living ↔ kitchen
    door(hDiv, 150, 90),    // hall → master
    door(hDiv, 450, 90),    // hall → bedroom 2
    door(hDiv, 700, 80),    // hall → bath
    win(o.n, 180, 150),     // living window
    win(o.n, 600, 150),     // kitchen window
    win(o.s, 600, 150),     // master window (south)
    win(o.s, 300, 130),     // bedroom 2 window
    win(o.e, 120, 120),     // kitchen east window
  ]

  const furniture = [
    // Living (40–480 × 40–340)
    f('sofa', 80, 230, { w: 220, d: 95 }),
    f('table', 150, 130, { w: 130, d: 70 }),
    f('tv', 90, 60, { w: 140, d: 15 }),
    f('chair', 330, 220),
    // Kitchen (480–840 × 40–340)
    f('fridge', 760, 60),
    f('stove', 690, 60),
    f('sink', 620, 60, { w: 60, d: 50 }),
    f('table', 560, 200, { w: 140, d: 80 }),
    f('chair', 580, 150),
    f('chair', 580, 290, { rot: Math.PI }),
    // Master bedroom (40–340 × 340–640)
    f('bed', 80, 380, { w: 180, d: 210 }),
    f('wardrobe', 80, 600 - 60, { w: 140, d: 55 }),
    // Bedroom 2 (340–600 × 340–640)
    f('bed', 380, 380, { w: 140, d: 200 }),
    f('dresser', 530, 380),
    // Bathroom (600–840 × 340–640)
    f('toilet', 620, 360),
    f('bathtub', 740, 380, { w: 80, d: 170 }),
    f('sink', 620, 470, { w: 60, d: 45 }),
  ]
  return design('Family House', walls, openings, furniture)
}

/** Small office suite: reception, meeting room, open desk area. ~7.2 × 4.8 m */
function officeSuite(): Design {
  const o = outer(40, 40, 760, 520)
  const meetV = w(540, 40, 540, 240)    // meeting room (top-right) left wall
  const meetH = w(540, 240, 760, 240)   // meeting room bottom wall
  const recV = w(240, 280, 240, 520)    // restroom/reception divider (bottom-left)
  const recH = w(40, 280, 240, 280)
  const walls = [o.n, o.e, o.s, o.w, meetV, meetH, recV, recH]

  const openings = [
    door(o.w, 380, 100),    // main entrance
    door(meetV, 70, 90),    // into meeting room
    door(recH, 80, 80),     // into restroom
    win(o.n, 120, 150),
    win(o.n, 560, 140),     // meeting room window
    win(o.e, 320, 120),
    win(o.s, 300, 150),
  ]

  const furniture = [
    // Open desk area (center)
    f('desk', 300, 90, { w: 140, d: 70 }),
    f('chair', 350, 170, { rot: Math.PI }),
    f('desk', 300, 220, { w: 140, d: 70 }),
    f('chair', 350, 300, { rot: Math.PI }),
    f('desk', 300, 360, { w: 140, d: 70 }),
    f('chair', 350, 440, { rot: Math.PI }),
    // Meeting room (540–760 × 40–240)
    f('table', 575, 90, { w: 150, d: 90 }),
    f('chair', 580, 60),
    f('chair', 660, 60),
    f('chair', 580, 185, { rot: Math.PI }),
    f('chair', 660, 185, { rot: Math.PI }),
    // Reception (bottom-left, below recH)
    f('desk', 60, 320, { w: 140, d: 70 }),
    f('chair', 110, 410),
    f('sofa', 60, 440, { w: 160, d: 70 }),
    // Restroom (top-left of the divided corner)
    f('toilet', 60, 300),
    f('sink', 150, 300, { w: 60, d: 45 }),
  ]
  return design('Office Suite', walls, openings, furniture)
}

/** Open-plan loft: one big room with a sleeping nook + bathroom. ~7.0 × 5.0 m */
function loft(): Design {
  const o = outer(40, 40, 740, 540)
  // Bathroom carved into the top-right (540-740 × 40-220)
  const bathV = w(540, 40, 540, 220)
  const bathH = w(540, 220, 740, 220)
  // Half-height wall partitioning the sleeping nook (bottom-left)
  const sleepV = w(280, 380, 280, 540)
  const walls = [o.n, o.e, o.s, o.w, bathV, bathH, sleepV]

  const openings = [
    door(o.w, 420, 100),
    door(bathV, 80, 80),
    win(o.n, 100, 200, 140, 90),
    win(o.n, 380, 140, 120, 90),
    win(o.s, 360, 180, 140, 90),
    win(o.e, 320, 140, 130, 90),
  ]

  const furniture = [
    // Living (center-right)
    f('sofa', 320, 80, { w: 220, d: 95 }),
    f('table', 360, 200, { w: 130, d: 75 }),
    f('tv', 320, 280, { w: 140, d: 15 }),
    f('chair', 530, 250),
    // Kitchen (left strip)
    f('fridge', 60, 70),
    f('stove', 140, 70),
    f('sink', 215, 75, { w: 60, d: 50 }),
    f('table', 60, 200, { w: 200, d: 80 }),
    f('chair', 90, 290),
    f('chair', 180, 290),
    // Sleeping nook (bottom-left)
    f('bed', 60, 410, { w: 160, d: 200 }),
    f('dresser', 60, 380, { w: 100, d: 40 }),
    // Bathroom
    f('toilet', 560, 60),
    f('bathtub', 640, 60, { w: 80, d: 150 }),
  ]
  return design('Loft', walls, openings, furniture)
}

/** Tiny house: a single 4×5 m room with stairs to a sleeping loft. */
function tinyHouse(): Design {
  const o = outer(40, 40, 440, 540)
  const walls = [o.n, o.e, o.s, o.w]

  const openings = [
    door(o.s, 170, 90),
    win(o.n, 130, 140, 120, 90),
    win(o.e, 200, 120, 120, 90),
    win(o.w, 200, 120, 120, 90),
  ]

  const furniture = [
    // Kitchenette north
    f('fridge', 60, 60),
    f('stove', 140, 60),
    f('sink', 220, 65, { w: 60, d: 50 }),
    // Living
    f('sofa', 60, 200, { w: 180, d: 85 }),
    f('table', 270, 220, { w: 100, d: 60 }),
    // Bath strip
    f('toilet', 320, 360),
    f('bathtub', 60, 380, { w: 80, d: 140 }),
    // Stairs to loft
    f('stairs', 220, 380, { w: 100, d: 140 }),
  ]
  return design('Tiny House', walls, openings, furniture)
}

/** Two-storey house: ground floor (living + kitchen) and upper floor
 *  (bedrooms + bath), connected via stairs. */
function twoStoreyHouse(): Design {
  // ─ Ground floor ──────────────────────────────────────────────────────────
  const g = outer(40, 40, 740, 540)
  const gDiv = w(420, 40, 420, 380) // living | kitchen
  const gStairsV = w(420, 380, 420, 540) // continues to enclose stairs
  const gStairsH = w(420, 380, 580, 380) // top of stairs wall
  const groundWalls = [g.n, g.e, g.s, g.w, gDiv, gStairsV, gStairsH]
  const groundOpenings = [
    door(g.w, 380, 100),
    door(gDiv, 100, 100),
    win(g.n, 130, 150),
    win(g.n, 500, 150),
    win(g.s, 160, 140),
    win(g.e, 200, 140),
  ]
  const groundFurniture: Furniture[] = [
    // Living
    f('sofa', 80, 240, { w: 220, d: 95 }),
    f('table', 140, 140, { w: 130, d: 70 }),
    f('tv', 80, 70, { w: 140, d: 15 }),
    f('chair', 320, 250),
    // Kitchen
    f('fridge', 660, 60),
    f('stove', 580, 60),
    f('sink', 500, 65, { w: 60, d: 50 }),
    f('table', 460, 200, { w: 140, d: 80 }),
    f('chair', 480, 150),
    f('chair', 480, 290, { rot: Math.PI }),
    // Stairs up
    f('stairs', 440, 400, { w: 130, d: 130 }),
  ]
  const groundFloor: Floor = {
    id: nanoid(),
    name: 'Ground Floor',
    height: 280,
    walls: groundWalls,
    openings: groundOpenings,
    furniture: groundFurniture,
  }

  // ─ Upper floor (same outer footprint, different layout) ─────────────────
  const u = outer(40, 40, 740, 540)
  const uHall = w(40, 280, 740, 280)
  const uBed = w(340, 40, 340, 280)
  const uBath = w(560, 280, 560, 540)
  const upperWalls = [u.n, u.e, u.s, u.w, uHall, uBed, uBath]
  const upperOpenings = [
    door(uHall, 150, 90),
    door(uHall, 450, 90),
    door(uBath, 60, 80),
    win(u.n, 130, 150),
    win(u.n, 500, 150),
    win(u.s, 100, 150),
    win(u.s, 460, 150),
  ]
  const upperFurniture: Furniture[] = [
    // Master (top-left)
    f('bed', 90, 80, { w: 180, d: 210 }),
    f('wardrobe', 90, 220, { w: 140, d: 55 }),
    // Kid's room (top-right)
    f('bed', 380, 80, { w: 140, d: 200 }),
    f('dresser', 580, 80),
    // Bathroom (bottom-right)
    f('toilet', 580, 300),
    f('bathtub', 660, 320, { w: 70, d: 150 }),
    // Hall (bottom-left)
    f('stairs', 440, 380, { w: 130, d: 130 }), // matching stairwell
  ]
  const upperFloor: Floor = {
    id: nanoid(),
    name: 'Upper Floor',
    height: 280,
    walls: upperWalls,
    openings: upperOpenings,
    furniture: upperFurniture,
  }

  return { version: CURRENT_VERSION, floors: [groundFloor, upperFloor] }
}

/** Coffee shop: customer area, bar, kitchen, restroom. ~7.5 × 5 m */
function coffeeShop(): Design {
  const o = outer(40, 40, 790, 540)
  const barV = w(40, 320, 580, 320)     // back-of-house divider (kitchen behind)
  const kitchenV = w(580, 40, 580, 320) // kitchen / restroom partition
  const restroomH = w(580, 200, 790, 200)
  const walls = [o.n, o.e, o.s, o.w, barV, kitchenV, restroomH]

  const openings = [
    door(o.s, 350, 110),
    door(barV, 200, 90),
    door(kitchenV, 100, 80),
    door(restroomH, 90, 70),
    win(o.s, 100, 200, 140, 90),
    win(o.s, 540, 200, 140, 90),
    win(o.w, 200, 180, 140, 90),
  ]

  const furniture: Furniture[] = [
    // Customer seating (bottom area)
    f('table', 80, 360, { w: 80, d: 80 }),
    f('chair', 95, 325, { w: 40, d: 40 }),
    f('chair', 95, 445, { w: 40, d: 40, rot: Math.PI }),
    f('table', 220, 360, { w: 80, d: 80 }),
    f('chair', 235, 325, { w: 40, d: 40 }),
    f('chair', 235, 445, { w: 40, d: 40, rot: Math.PI }),
    f('table', 360, 360, { w: 80, d: 80 }),
    f('chair', 375, 325, { w: 40, d: 40 }),
    f('chair', 375, 445, { w: 40, d: 40, rot: Math.PI }),
    f('sofa', 60, 460, { w: 280, d: 70 }),
    // Bar / counter (above the divider, customer side)
    f('table', 80, 250, { w: 450, d: 55 }),
    // Kitchen (top-left of barV)
    f('fridge', 60, 60),
    f('stove', 140, 60),
    f('sink', 220, 65, { w: 60, d: 50 }),
    f('table', 300, 80, { w: 200, d: 70 }),
    // Restroom (top-right)
    f('toilet', 600, 60),
    f('sink', 700, 60, { w: 60, d: 45 }),
    // Storage (bottom of restroom column)
    f('dresser', 600, 240),
  ]
  return design('Coffee Shop', walls, openings, furniture)
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
  // Apartments
  { id: 'studio',     name: 'Studio',                description: 'Compact open-plan living with a corner bathroom — perfect for a first sketch.', category: 'apartment', icon: '🛏️', rooms: 'Open plan · 1 bath', build: studio },
  { id: 'loft',       name: 'Loft',                  description: 'Industrial open-plan loft with a sleeping nook and a private bathroom.',       category: 'apartment', icon: '🏙️', rooms: 'Living · Kitchen · Sleep nook · Bath', build: loft },
  { id: 'one-bed',    name: '1-Bedroom Apartment',   description: 'Open living/kitchen with a separate bedroom and full bathroom.',              category: 'apartment', icon: '🛋️', rooms: 'Living · Kitchen · 1 bed · 1 bath', build: oneBed },
  { id: 'two-bed',    name: '2-Bedroom Apartment',   description: 'A fully furnished flat with living room, kitchen, bedroom, bathroom and office.', category: 'apartment', icon: '🏠', rooms: 'Living · Kitchen · Bed · Bath · Office', build: twoBed },
  // Houses
  { id: 'tiny',       name: 'Tiny House',            description: 'A 4×5 m single-room cabin with stairs to a sleeping loft.',                   category: 'house',     icon: '🛖', rooms: 'Open plan · Stairs · Bath', build: tinyHouse },
  { id: 'family',     name: 'Family House',          description: 'Detached house with a public top floor and two bedrooms plus a bathroom below.', category: 'house',   icon: '🏡', rooms: 'Living · Kitchen · 2 beds · 1 bath', build: familyHouse },
  { id: 'two-storey', name: 'Two-Storey House',      description: 'Ground floor public spaces with stairs up to two bedrooms and a bathroom.',   category: 'house',     icon: '🏘️', rooms: '2 floors · 2 beds · 1.5 bath', build: twoStoreyHouse },
  // Workspaces
  { id: 'office',     name: 'Office Suite',          description: 'Reception, a glass meeting room and an open-plan desk area with a restroom.', category: 'workspace', icon: '🖥️', rooms: 'Reception · Meeting · Open desks', build: officeSuite },
  { id: 'coffee',     name: 'Coffee Shop',           description: 'Customer seating, service bar, back-of-house kitchen and a restroom.',        category: 'workspace', icon: '☕', rooms: 'Counter · Seating · Kitchen · Restroom', build: coffeeShop },
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

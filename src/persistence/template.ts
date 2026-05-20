import { nanoid } from 'nanoid'
import type { Design, Floor, Wall, Opening, Furniture, FurnitureKind } from '../store/types'
import { CURRENT_VERSION } from './storage'

// ─── Helpers ───────────────────────────────────────────────────────────────

function w(ax: number, ay: number, bx: number, by: number): Wall {
  return { id: nanoid(), a: { x: ax, y: ay }, b: { x: bx, y: by }, thickness: 15, height: 260 }
}

function opening(
  wallId: string,
  type: 'door' | 'window',
  offset: number,
  width: number,
  height: number,
  sillHeight = 0,
): Opening {
  return { id: nanoid(), wallId, type, offset, width, height, sillHeight }
}

function f(
  kind: FurnitureKind,
  x: number,
  y: number,
  sw: number,
  sd: number,
  sh: number,
  rotation = 0,
  color?: string,
): Furniture {
  return { id: nanoid(), kind, position: { x, y }, rotation, size: { w: sw, d: sd, h: sh }, color }
}

// ─── Template layout ───────────────────────────────────────────────────────
//
//  50,50 ──────── 450,50 ──────────────── 750,50
//   │   Living room    │     Kitchen          │
//   │   (400 × 275)    │     (300 × 275)      │
//  50,325 ─────── 450,325 ──── 600,325 ── 750,325
//   │   Bedroom        │  Bathroom │  Office   │
//   │   (400 × 275)    │  (150×275)│  (150×275)│
//  50,600 ─────── 450,600 ──────────────── 750,600

export function createTemplate(): Design {
  // Outer walls
  const wN  = w(50, 50, 750, 50)       // north
  const wE  = w(750, 50, 750, 600)     // east
  const wS  = w(750, 600, 50, 600)     // south
  const wW  = w(50, 600, 50, 50)       // west

  // Inner walls
  const wH  = w(50, 325, 750, 325)     // horizontal divider (living/kitchen top, rooms bottom)
  const wLK = w(450, 50, 450, 325)     // living / kitchen divider
  const wBB = w(450, 325, 450, 600)    // bedroom / right divider
  const wBO = w(600, 325, 600, 600)    // bathroom / office divider

  const walls = [wN, wE, wS, wW, wH, wLK, wBB, wBO]

  // ── Openings ──────────────────────────────────────────────────────────────
  // West wall (50,600)→(50,50), length=550. Offset measured from (50,600).
  // Front door in living-room strip: offset=380 → y=600-380=220 → door at y=220-130.
  const openings: Opening[] = [
    opening(wW.id,  'door',   380,  90, 210),       // front entrance
    opening(wLK.id, 'door',    55, 210, 240),       // wide living↔kitchen opening
    opening(wH.id,  'door',    75,  90, 210),       // bedroom door
    opening(wBB.id, 'door',    50,  80, 210),       // bathroom door
    opening(wBO.id, 'door',    30,  75, 210),       // office door

    // Windows
    opening(wN.id,  'window',  70, 150, 120, 90),   // living room north window
    opening(wN.id,  'window', 500, 130, 120, 90),   // kitchen north window
    opening(wE.id,  'window',  80, 120, 120, 90),   // kitchen/office east window
    opening(wS.id,  'window', 330, 150, 120, 90),   // bedroom south window
  ]

  // ── Furniture ─────────────────────────────────────────────────────────────
  const furniture: Furniture[] = [
    // Living room (x:50-450, y:50-325)
    f('tv',    182, 68,  130, 15, 80),             // north wall, facing south
    f('sofa',  130, 218, 200, 90, 85),             // south area, facing TV
    f('table', 200, 153, 110, 60, 45),             // coffee table between sofa and TV
    f('chair', 355, 195,  50, 50, 90),             // accent chair

    // Kitchen (x:450-750, y:50-325)
    f('fridge', 668, 65,   70, 65, 185),           // east wall
    f('stove',  672, 155,  60, 60,  90),
    f('sink',   673, 238,  60, 50,  85),
    f('table',  478, 148, 120, 70,  75),           // kitchen table
    f('chair',  493, 105,  50, 50,  90),           // chair north of table
    f('chair',  493, 233,  50, 50,  90, Math.PI),  // chair south of table (flipped)

    // Bedroom (x:50-450, y:325-600)
    f('bed',      90, 362, 160, 200, 50),          // left side of bedroom
    f('wardrobe', 320, 340, 120,  60, 210),        // right wall
    f('dresser',  320, 430, 100,  50,  80),        // below wardrobe

    // Bathroom (x:450-600, y:325-600)
    f('toilet',  460, 342,  40,  70, 80),          // near divider wall
    f('bathtub', 455, 428,  80, 155, 60),          // larger bathtub

    // Office (x:600-750, y:325-600)
    f('desk',    608, 342, 130,  65, 75),          // north wall
    f('chair',   648, 423,  50,  50, 90, Math.PI), // desk chair
  ]

  const floor: Floor = {
    id: nanoid(),
    name: 'Ground Floor',
    height: 280,
    walls,
    openings,
    furniture,
  }

  return { version: CURRENT_VERSION, floors: [floor] }
}

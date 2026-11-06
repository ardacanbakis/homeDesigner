import type { Furniture, FurnitureKind, FloorMaterial } from '../store/types'

export type FurnitureCategory = 'bedroom' | 'kitchen' | 'living' | 'bathroom' | 'office' | 'decor' | 'structure' | 'custom'

export type CatalogEntry = {
  kind: FurnitureKind
  label: string
  category: FurnitureCategory
  color: string
  size: { w: number; d: number; h: number } // cm
  icon: string
}

export const CATALOG: CatalogEntry[] = [
  // Bedroom
  { kind: 'bed',        label: 'Bed',        category: 'bedroom',   color: '#8B7355', size: { w: 160, d: 200, h: 50  }, icon: '🛏️' },
  { kind: 'wardrobe',   label: 'Wardrobe',   category: 'bedroom',   color: '#6B5B45', size: { w: 120, d: 60,  h: 210 }, icon: '🚪' },
  { kind: 'dresser',    label: 'Dresser',    category: 'bedroom',   color: '#A0856E', size: { w: 100, d: 50,  h: 80  }, icon: '🗄️' },
  { kind: 'nightstand', label: 'Nightstand', category: 'bedroom',   color: '#9A7B5F', size: { w: 45,  d: 40,  h: 55  }, icon: '🕯️' },
  // Kitchen
  { kind: 'fridge',     label: 'Fridge',     category: 'kitchen',   color: '#B0C4DE', size: { w: 70,  d: 65,  h: 185 }, icon: '🧊' },
  { kind: 'stove',      label: 'Stove',      category: 'kitchen',   color: '#708090', size: { w: 60,  d: 60,  h: 90  }, icon: '🍳' },
  { kind: 'sink',       label: 'Sink',       category: 'kitchen',   color: '#87CEEB', size: { w: 60,  d: 50,  h: 85  }, icon: '🚰' },
  { kind: 'counter',    label: 'Counter',    category: 'kitchen',   color: '#C9B79C', size: { w: 120, d: 60,  h: 90  }, icon: '🍽️' },
  { kind: 'washer',     label: 'Washer',     category: 'kitchen',   color: '#C8D8E8', size: { w: 60,  d: 60,  h: 85  }, icon: '🌀' },
  // Living
  { kind: 'sofa',       label: 'Sofa',       category: 'living',    color: '#778899', size: { w: 200, d: 90,  h: 85  }, icon: '🛋️' },
  { kind: 'table',      label: 'Table',      category: 'living',    color: '#8B6914', size: { w: 160, d: 90,  h: 75  }, icon: '⬛' },
  { kind: 'chair',      label: 'Chair',      category: 'living',    color: '#696969', size: { w: 50,  d: 50,  h: 90  }, icon: '🪑' },
  { kind: 'tv',         label: 'TV',         category: 'living',    color: '#2F2F2F', size: { w: 130, d: 15,  h: 80  }, icon: '📺' },
  { kind: 'bookshelf',  label: 'Bookshelf',  category: 'living',    color: '#7A5C42', size: { w: 80,  d: 30,  h: 190 }, icon: '📚' },
  // Bathroom
  { kind: 'toilet',     label: 'Toilet',     category: 'bathroom',  color: '#F5F5F5', size: { w: 40,  d: 70,  h: 80  }, icon: '🚽' },
  { kind: 'bathtub',    label: 'Bathtub',    category: 'bathroom',  color: '#E0E8F0', size: { w: 80,  d: 170, h: 60  }, icon: '🛁' },
  { kind: 'shower',     label: 'Shower',     category: 'bathroom',  color: '#CFE3EE', size: { w: 90,  d: 90,  h: 210 }, icon: '🚿' },
  // Office
  { kind: 'desk',       label: 'Desk',       category: 'office',    color: '#8B7355', size: { w: 140, d: 70,  h: 75  }, icon: '🖥️' },
  // Decor
  { kind: 'rug',        label: 'Rug',        category: 'decor',     color: '#B5838D', size: { w: 200, d: 140, h: 1   }, icon: '🧶' },
  { kind: 'plant',      label: 'Plant',      category: 'decor',     color: '#4F7942', size: { w: 45,  d: 45,  h: 110 }, icon: '🪴' },
  { kind: 'lamp',       label: 'Floor lamp', category: 'decor',     color: '#D9C9A3', size: { w: 40,  d: 40,  h: 160 }, icon: '💡' },
  // Structure
  { kind: 'stairs',     label: 'Stairs',     category: 'structure', color: '#9c8e7a', size: { w: 100, d: 280, h: 280 }, icon: '🪜' },
  // Custom placeholder (never shown in catalog, used by custom objects)
  { kind: 'custom',     label: 'Custom',     category: 'custom',    color: '#64748b', size: { w: 100, d: 100, h: 100 }, icon: '📦' },
]

export const CATALOG_MAP = Object.fromEntries(CATALOG.map(e => [e.kind, e])) as Record<FurnitureKind, CatalogEntry>

/** Pieces that lie flat on the floor (rugs): other furniture may stand on them,
 *  so they're ignored by overlap checks and drawn beneath everything else. */
export function isFlat(kind: FurnitureKind): boolean {
  return kind === 'rug'
}

/** The colour the user picked for a piece, or undefined when it still has its
 *  catalog default (new pieces and templates store that default explicitly). */
export function customColor(f: Pick<Furniture, 'kind' | 'color'>): string | undefined {
  if (!f.color || f.kind === 'custom') return f.color
  return f.color.toLowerCase() === CATALOG_MAP[f.kind].color.toLowerCase() ? undefined : f.color
}

/** Wall paints offered for rooms (any #rrggbb colour is allowed). */
export const WALL_PAINTS: { label: string; color: string }[] = [
  { label: 'Warm white', color: '#F1ECE2' },
  { label: 'Greige',     color: '#D5CBBE' },
  { label: 'Sage',       color: '#B3C1A4' },
  { label: 'Mist blue',  color: '#AEC0CE' },
  { label: 'Blush',      color: '#E4C3BC' },
  { label: 'Terracotta', color: '#C98A6C' },
  { label: 'Navy',       color: '#45546C' },
]

/** Floor finishes a room can be given, with their plan/3D colour. */
export const FLOOR_MATERIALS: Record<FloorMaterial, { label: string; color: string; roughness: number }> = {
  wood:     { label: 'Wood',     color: '#B08A5E', roughness: 0.6 },
  tile:     { label: 'Tile',     color: '#DCE1E6', roughness: 0.3 },
  carpet:   { label: 'Carpet',   color: '#8D8299', roughness: 1.0 },
  concrete: { label: 'Concrete', color: '#A3A8AD', roughness: 0.9 },
  marble:   { label: 'Marble',   color: '#ECE8E1', roughness: 0.15 },
}

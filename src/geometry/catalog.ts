import type { FurnitureKind } from '../store/types'

export type FurnitureCategory = 'bedroom' | 'kitchen' | 'living' | 'bathroom' | 'office' | 'structure' | 'custom'

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
  { kind: 'bed',      label: 'Bed',      category: 'bedroom', color: '#8B7355', size: { w: 160, d: 200, h: 50  }, icon: '🛏️' },
  { kind: 'wardrobe', label: 'Wardrobe', category: 'bedroom', color: '#6B5B45', size: { w: 120, d: 60,  h: 210 }, icon: '🚪' },
  { kind: 'dresser',  label: 'Dresser',  category: 'bedroom', color: '#A0856E', size: { w: 100, d: 50,  h: 80  }, icon: '🗄️' },
  // Kitchen
  { kind: 'fridge',   label: 'Fridge',   category: 'kitchen', color: '#B0C4DE', size: { w: 70,  d: 65,  h: 185 }, icon: '🧊' },
  { kind: 'washer',   label: 'Washer',   category: 'kitchen', color: '#C8D8E8', size: { w: 60,  d: 60,  h: 85  }, icon: '🌀' },
  { kind: 'stove',    label: 'Stove',    category: 'kitchen', color: '#708090', size: { w: 60,  d: 60,  h: 90  }, icon: '🍳' },
  { kind: 'sink',     label: 'Sink',     category: 'kitchen', color: '#87CEEB', size: { w: 60,  d: 50,  h: 85  }, icon: '🚿' },
  // Living
  { kind: 'sofa',     label: 'Sofa',     category: 'living',  color: '#778899', size: { w: 200, d: 90,  h: 85  }, icon: '🛋️' },
  { kind: 'table',    label: 'Table',    category: 'living',  color: '#8B6914', size: { w: 160, d: 90,  h: 75  }, icon: '⬛' },
  { kind: 'chair',    label: 'Chair',    category: 'living',  color: '#696969', size: { w: 50,  d: 50,  h: 90  }, icon: '🪑' },
  { kind: 'tv',       label: 'TV',       category: 'living',  color: '#2F2F2F', size: { w: 130, d: 15,  h: 80  }, icon: '📺' },
  // Bathroom
  { kind: 'toilet',   label: 'Toilet',   category: 'bathroom',color: '#F5F5F5', size: { w: 40,  d: 70,  h: 80  }, icon: '🚽' },
  { kind: 'bathtub',  label: 'Bathtub',  category: 'bathroom',color: '#E0E8F0', size: { w: 80,  d: 170, h: 60  }, icon: '🛁' },
  // Office
  { kind: 'desk',     label: 'Desk',     category: 'office',  color: '#8B7355', size: { w: 140, d: 70,  h: 75  }, icon: '🖥️' },
  // Structure
  { kind: 'stairs',   label: 'Stairs',   category: 'structure',color:'#9c8e7a', size: { w: 100, d: 280, h: 280 }, icon: '🪜' },
  // Custom placeholder (never shown in catalog, used by custom objects)
  { kind: 'custom',   label: 'Custom',   category: 'custom',  color: '#64748b', size: { w: 100, d: 100, h: 100 }, icon: '📦' },
]

export const CATALOG_MAP = Object.fromEntries(CATALOG.map(e => [e.kind, e])) as Record<FurnitureKind, CatalogEntry>

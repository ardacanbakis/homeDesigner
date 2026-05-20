export type Vec2 = { x: number; y: number }

export type Wall = {
  id: string
  a: Vec2
  b: Vec2
  thickness: number
  height: number
}

export type Opening = {
  id: string
  wallId: string
  type: 'door' | 'window'
  offset: number
  width: number
  height: number
  sillHeight: number
}

export type FurnitureKind =
  | 'bed'
  | 'fridge'
  | 'washer'
  | 'wardrobe'
  | 'sofa'
  | 'table'
  | 'chair'
  | 'toilet'
  | 'sink'
  | 'stove'
  | 'tv'
  | 'dresser'
  | 'bathtub'
  | 'desk'
  | 'stairs'
  | 'custom'

export type Furniture = {
  id: string
  kind: FurnitureKind
  position: Vec2
  rotation: number
  size: { w: number; d: number; h: number }
  color?: string
  customLabel?: string // only for kind='custom'
}

export type Floor = {
  id: string
  name: string
  height: number
  walls: Wall[]
  openings: Opening[]
  furniture: Furniture[]
}

export type Design = {
  version: number
  floors: Floor[]
}

export type ViewMode = '2d' | '3d'

export type ActiveTool = 'select' | 'wall'

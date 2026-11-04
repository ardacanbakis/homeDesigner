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
  | 'nightstand'
  | 'bookshelf'
  | 'lamp'
  | 'plant'
  | 'rug'
  | 'counter'
  | 'shower'
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

export type FloorMaterial = 'wood' | 'tile' | 'carpet' | 'concrete' | 'marble'

/** User overrides for a room. Rooms are derived from walls, so a tag is anchored
 *  at a point and applies to whichever room contains it — surviving wall edits. */
export type RoomTag = {
  id: string
  at: Vec2
  name?: string
  material?: FloorMaterial
}

export type Floor = {
  id: string
  name: string
  height: number
  walls: Wall[]
  openings: Opening[]
  furniture: Furniture[]
  roomTags?: RoomTag[]
}

export type Design = {
  version: number
  floors: Floor[]
}

export type ViewMode = '2d' | '3d'

export type ActiveTool = 'select' | 'wall'

export type CameraMode = 'orbit' | 'walk' | 'top' | 'front' | 'iso'

/** Display units. Geometry is always stored in cm; this only affects UI. */
export type Units = 'cm' | 'm' | 'ftin'

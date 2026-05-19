import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { CATALOG_MAP } from '../geometry/catalog'
import { saveDesign, loadDesign } from '../persistence/storage'
import type { Wall, Furniture, FurnitureKind, Vec2, Design, ViewMode, ActiveTool } from './types'

type State = {
  design: Design
  viewMode: ViewMode
  activeTool: ActiveTool
  selectedId: string | null
  snapEnabled: boolean
  gridSize: number // cm
}

type Actions = {
  setViewMode: (m: ViewMode) => void
  setActiveTool: (t: ActiveTool) => void
  setSelected: (id: string | null) => void
  toggleSnap: () => void

  addWall: (a: Vec2, b: Vec2) => void
  moveWallEndpoint: (wallId: string, endpoint: 'a' | 'b', pos: Vec2) => void
  deleteWall: (id: string) => void

  addFurniture: (kind: FurnitureKind, position: Vec2) => void
  moveFurniture: (id: string, position: Vec2) => void
  rotateFurniture: (id: string, delta: number) => void
  deleteFurniture: (id: string) => void
  updateFurnitureSize: (id: string, size: Partial<{ w: number; d: number; h: number }>) => void

  loadDesign: (design: Design) => void
  newDesign: () => void
  save: () => void
}

const EMPTY_DESIGN: Design = {
  version: 1,
  walls: [],
  openings: [],
  furniture: [],
}

function freshDesign(): Design {
  const saved = loadDesign()
  return saved ?? { ...EMPTY_DESIGN }
}

export const useDesignStore = create<State & Actions>((set, get) => ({
  design: freshDesign(),
  viewMode: '2d',
  activeTool: 'select',
  selectedId: null,
  snapEnabled: true,
  gridSize: 20,

  setViewMode: m => set({ viewMode: m }),
  setActiveTool: t => set({ activeTool: t }),
  setSelected: id => set({ selectedId: id }),
  toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),

  addWall: (a, b) => {
    const wall: Wall = { id: nanoid(), a, b, thickness: 15, height: 260 }
    set(s => {
      const design = { ...s.design, walls: [...s.design.walls, wall] }
      saveDesign(design)
      return { design }
    })
  },

  moveWallEndpoint: (wallId, endpoint, pos) => {
    set(s => {
      const walls = s.design.walls.map(w =>
        w.id === wallId ? { ...w, [endpoint]: pos } : w
      )
      const design = { ...s.design, walls }
      saveDesign(design)
      return { design }
    })
  },

  deleteWall: id => {
    set(s => {
      const walls = s.design.walls.filter(w => w.id !== id)
      const design = { ...s.design, walls }
      saveDesign(design)
      return { design, selectedId: s.selectedId === id ? null : s.selectedId }
    })
  },

  addFurniture: (kind, position) => {
    const entry = CATALOG_MAP[kind]
    const item: Furniture = {
      id: nanoid(),
      kind,
      position,
      rotation: 0,
      size: { ...entry.size },
      color: entry.color,
    }
    set(s => {
      const design = { ...s.design, furniture: [...s.design.furniture, item] }
      saveDesign(design)
      return { design, selectedId: item.id }
    })
  },

  moveFurniture: (id, position) => {
    set(s => {
      const furniture = s.design.furniture.map(f => f.id === id ? { ...f, position } : f)
      const design = { ...s.design, furniture }
      saveDesign(design)
      return { design }
    })
  },

  rotateFurniture: (id, delta) => {
    set(s => {
      const furniture = s.design.furniture.map(f =>
        f.id === id ? { ...f, rotation: f.rotation + delta } : f
      )
      const design = { ...s.design, furniture }
      saveDesign(design)
      return { design }
    })
  },

  deleteFurniture: id => {
    set(s => {
      const furniture = s.design.furniture.filter(f => f.id !== id)
      const design = { ...s.design, furniture }
      saveDesign(design)
      return { design, selectedId: s.selectedId === id ? null : s.selectedId }
    })
  },

  updateFurnitureSize: (id, size) => {
    set(s => {
      const furniture = s.design.furniture.map(f =>
        f.id === id ? { ...f, size: { ...f.size, ...size } } : f
      )
      const design = { ...s.design, furniture }
      saveDesign(design)
      return { design }
    })
  },

  loadDesign: design => {
    saveDesign(design)
    set({ design, selectedId: null })
  },

  newDesign: () => {
    const design = { ...EMPTY_DESIGN }
    saveDesign(design)
    set({ design, selectedId: null })
  },

  save: () => {
    saveDesign(get().design)
  },
}))

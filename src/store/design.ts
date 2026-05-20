import { create } from 'zustand'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import { CATALOG_MAP } from '../geometry/catalog'
import { saveDesign, loadDesign } from '../persistence/storage'
import { wallLength } from '../geometry/walls'
import type { Wall, Opening, Furniture, FurnitureKind, Vec2, Design, ViewMode, ActiveTool } from './types'

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
  undo: () => void
  redo: () => void

  addWall: (a: Vec2, b: Vec2) => void
  moveWallEndpoint: (wallId: string, endpoint: 'a' | 'b', pos: Vec2) => void
  setWallLength: (wallId: string, length: number) => void
  updateWall: (wallId: string, patch: Partial<Pick<Wall, 'height' | 'thickness'>>) => void
  deleteWall: (id: string) => void

  addOpening: (wallId: string, type: Opening['type']) => void
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id' | 'wallId'>>) => void
  deleteOpening: (id: string) => void

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

function commit(design: Design): Design {
  saveDesign(design)
  return design
}

const useDesignStoreBase = create<State & Actions>()(
  temporal(
    (set, get) => ({
      design: freshDesign(),
      viewMode: '2d' as ViewMode,
      activeTool: 'select' as ActiveTool,
      selectedId: null as string | null,
      snapEnabled: true,
      gridSize: 5,

      setViewMode: m => set({ viewMode: m }),
      setActiveTool: t => set({ activeTool: t }),
      setSelected: id => set({ selectedId: id }),
      toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),

      undo: () => {
        useDesignStoreBase.temporal.getState().undo()
        saveDesign(get().design)
      },
      redo: () => {
        useDesignStoreBase.temporal.getState().redo()
        saveDesign(get().design)
      },

      // ── Walls ──────────────────────────────────────────────────────────────
      addWall: (a, b) => {
        const wall: Wall = { id: nanoid(), a, b, thickness: 15, height: 260 }
        set(s => ({ design: commit({ ...s.design, walls: [...s.design.walls, wall] }) }))
      },

      moveWallEndpoint: (wallId, endpoint, pos) => {
        set(s => ({
          design: commit({
            ...s.design,
            walls: s.design.walls.map(w => w.id === wallId ? { ...w, [endpoint]: pos } : w),
          }),
        }))
      },

      // Resize a wall to an exact length, keeping endpoint `a` fixed and moving
      // `b` along the wall's current direction.
      setWallLength: (wallId, length) => {
        set(s => {
          const wall = s.design.walls.find(w => w.id === wallId)
          if (!wall || length <= 0) return {}
          const cur = wallLength(wall)
          if (cur === 0) return {}
          const ux = (wall.b.x - wall.a.x) / cur
          const uy = (wall.b.y - wall.a.y) / cur
          const b = { x: wall.a.x + ux * length, y: wall.a.y + uy * length }
          return {
            design: commit({
              ...s.design,
              walls: s.design.walls.map(w => w.id === wallId ? { ...w, b } : w),
            }),
          }
        })
      },

      updateWall: (wallId, patch) => {
        set(s => ({
          design: commit({
            ...s.design,
            walls: s.design.walls.map(w => w.id === wallId ? { ...w, ...patch } : w),
          }),
        }))
      },

      deleteWall: id => {
        set(s => ({
          design: commit({
            ...s.design,
            walls: s.design.walls.filter(w => w.id !== id),
            openings: s.design.openings.filter(o => o.wallId !== id),
          }),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }))
      },

      // ── Openings ────────────────────────────────────────────────────────────
      addOpening: (wallId, type) => {
        const wall = get().design.walls.find(w => w.id === wallId)
        if (!wall) return
        const len = wallLength(wall)
        const width = type === 'door' ? 90 : 100
        const height = type === 'door' ? 210 : 120
        const sillHeight = type === 'door' ? 0 : 90
        const offset = Math.max(0, (len - width) / 2)
        const opening: Opening = { id: nanoid(), wallId, type, offset, width, height, sillHeight }
        set(s => ({
          design: commit({ ...s.design, openings: [...s.design.openings, opening] }),
          selectedId: opening.id,
        }))
      },

      updateOpening: (id, patch) => {
        set(s => ({
          design: commit({
            ...s.design,
            openings: s.design.openings.map(o => o.id === id ? { ...o, ...patch } : o),
          }),
        }))
      },

      deleteOpening: id => {
        set(s => ({
          design: commit({ ...s.design, openings: s.design.openings.filter(o => o.id !== id) }),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }))
      },

      // ── Furniture ──────────────────────────────────────────────────────────
      addFurniture: (kind, position) => {
        const entry = CATALOG_MAP[kind]
        const item: Furniture = { id: nanoid(), kind, position, rotation: 0, size: { ...entry.size }, color: entry.color }
        set(s => ({
          design: commit({ ...s.design, furniture: [...s.design.furniture, item] }),
          selectedId: item.id,
        }))
      },

      moveFurniture: (id, position) => {
        set(s => ({
          design: commit({ ...s.design, furniture: s.design.furniture.map(f => f.id === id ? { ...f, position } : f) }),
        }))
      },

      rotateFurniture: (id, delta) => {
        set(s => ({
          design: commit({ ...s.design, furniture: s.design.furniture.map(f => f.id === id ? { ...f, rotation: f.rotation + delta } : f) }),
        }))
      },

      deleteFurniture: id => {
        set(s => ({
          design: commit({ ...s.design, furniture: s.design.furniture.filter(f => f.id !== id) }),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }))
      },

      updateFurnitureSize: (id, size) => {
        set(s => ({
          design: commit({ ...s.design, furniture: s.design.furniture.map(f => f.id === id ? { ...f, size: { ...f.size, ...size } } : f) }),
        }))
      },

      // ── Persistence ────────────────────────────────────────────────────────
      loadDesign: design => {
        saveDesign(design)
        set({ design, selectedId: null })
      },

      newDesign: () => {
        const design = { ...EMPTY_DESIGN }
        saveDesign(design)
        set({ design, selectedId: null })
      },

      save: () => saveDesign(get().design),
    }),
    // Only track `design` in undo history, not UI state
    { partialize: (s: State & Actions) => ({ design: s.design }) }
  )
)

export const useDesignStore = useDesignStoreBase

/** Reactive hook for undo/redo state (pastStates / futureStates lengths). */
import { useStore } from 'zustand'
export function useTemporalStore() {
  return useStore(useDesignStoreBase.temporal)
}

import { create } from 'zustand'
import { useStore } from 'zustand'
import { temporal } from 'zundo'
import { nanoid } from 'nanoid'
import { CATALOG_MAP } from '../geometry/catalog'
import { saveDesign, loadDesign, CURRENT_VERSION } from '../persistence/storage'
import { wallLength } from '../geometry/walls'
import type { Wall, Opening, Furniture, FurnitureKind, Vec2, Design, Floor, ViewMode, ActiveTool } from './types'

type State = {
  design: Design
  activeFloorId: string
  viewMode: ViewMode
  activeTool: ActiveTool
  selectedId: string | null
  snapEnabled: boolean
  gridSize: number // cm
  showWelcome: boolean
}

type Actions = {
  setViewMode: (m: ViewMode) => void
  setActiveTool: (t: ActiveTool) => void
  setSelected: (id: string | null) => void
  toggleSnap: () => void
  undo: () => void
  redo: () => void

  // Floors
  addFloor: () => void
  deleteFloor: (id: string) => void
  setActiveFloor: (id: string) => void
  renameFloor: (id: string, name: string) => void

  addWall: (a: Vec2, b: Vec2) => void
  moveWallEndpoint: (wallId: string, endpoint: 'a' | 'b', pos: Vec2) => void
  setWallLength: (wallId: string, length: number) => void
  updateWall: (wallId: string, patch: Partial<Pick<Wall, 'height' | 'thickness'>>) => void
  deleteWall: (id: string) => void

  addOpening: (wallId: string, type: Opening['type']) => void
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id' | 'wallId'>>) => void
  deleteOpening: (id: string) => void

  addFurniture: (kind: FurnitureKind, position: Vec2) => void
  addCustomFurniture: (label: string, size: { w: number; d: number; h: number }, color: string, position: Vec2) => void
  moveFurniture: (id: string, position: Vec2) => void
  rotateFurniture: (id: string, delta: number) => void
  deleteFurniture: (id: string) => void
  updateFurnitureSize: (id: string, size: Partial<{ w: number; d: number; h: number }>) => void
  updateFurnitureLabel: (id: string, label: string) => void

  loadDesign: (design: Design) => void
  newDesign: () => void
  save: () => void

  openWelcome: () => void
  closeWelcome: () => void
}

function emptyFloor(name: string): Floor {
  return { id: nanoid(), name, height: 280, walls: [], openings: [], furniture: [] }
}

function emptyDesign(): Design {
  return { version: CURRENT_VERSION, floors: [emptyFloor('Ground Floor')] }
}

function freshDesign(): Design {
  return loadDesign() ?? emptyDesign()
}

function isEmptyDesign(d: Design): boolean {
  return d.floors.length === 1 && d.floors[0].walls.length === 0 && d.floors[0].furniture.length === 0
}

function commit(design: Design): Design {
  saveDesign(design)
  return design
}

/** Cumulative elevation (cm) of each floor by index: floor 0 at 0, floor n above the sum of heights below. */
export function floorElevations(floors: Floor[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const f of floors) {
    out.push(acc)
    acc += f.height
  }
  return out
}

const useDesignStoreBase = create<State & Actions>()(
  temporal(
    (set, get) => {
      const initial = freshDesign()

      // Map a function over the active floor only.
      const mapActive = (s: State, fn: (f: Floor) => Floor): Design => ({
        ...s.design,
        floors: s.design.floors.map(f => (f.id === s.activeFloorId ? fn(f) : f)),
      })

      return {
        design: initial,
        activeFloorId: initial.floors[0].id,
        viewMode: '2d' as ViewMode,
        activeTool: 'select' as ActiveTool,
        selectedId: null as string | null,
        snapEnabled: true,
        gridSize: 5,
        showWelcome: isEmptyDesign(initial),

        setViewMode: m => set({ viewMode: m }),
        setActiveTool: t => set({ activeTool: t }),
        setSelected: id => set({ selectedId: id }),
        toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),

        undo: () => { useDesignStoreBase.temporal.getState().undo(); saveDesign(get().design) },
        redo: () => { useDesignStoreBase.temporal.getState().redo(); saveDesign(get().design) },

        // ── Floors ─────────────────────────────────────────────────────────
        addFloor: () => {
          const floor = emptyFloor(`Floor ${get().design.floors.length + 1}`)
          set(s => ({
            design: commit({ ...s.design, floors: [...s.design.floors, floor] }),
            activeFloorId: floor.id,
            selectedId: null,
          }))
        },

        deleteFloor: id => {
          set(s => {
            if (s.design.floors.length <= 1) return {}
            const floors = s.design.floors.filter(f => f.id !== id)
            const activeFloorId = s.activeFloorId === id ? floors[0].id : s.activeFloorId
            return { design: commit({ ...s.design, floors }), activeFloorId, selectedId: null }
          })
        },

        setActiveFloor: id => set({ activeFloorId: id, selectedId: null }),

        renameFloor: (id, name) => {
          set(s => ({ design: commit({ ...s.design, floors: s.design.floors.map(f => f.id === id ? { ...f, name } : f) }) }))
        },

        // ── Walls ──────────────────────────────────────────────────────────
        addWall: (a, b) => {
          const wall: Wall = { id: nanoid(), a, b, thickness: 15, height: 260 }
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, walls: [...f.walls, wall] }))) }))
        },

        moveWallEndpoint: (wallId, endpoint, pos) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, walls: f.walls.map(w => w.id === wallId ? { ...w, [endpoint]: pos } : w) }))) }))
        },

        setWallLength: (wallId, length) => {
          set(s => {
            const floor = s.design.floors.find(f => f.id === s.activeFloorId)
            const wall = floor?.walls.find(w => w.id === wallId)
            if (!wall || length <= 0) return {}
            const cur = wallLength(wall)
            if (cur === 0) return {}
            const ux = (wall.b.x - wall.a.x) / cur
            const uy = (wall.b.y - wall.a.y) / cur
            const b = { x: wall.a.x + ux * length, y: wall.a.y + uy * length }
            return { design: commit(mapActive(s, f => ({ ...f, walls: f.walls.map(w => w.id === wallId ? { ...w, b } : w) }))) }
          })
        },

        updateWall: (wallId, patch) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, walls: f.walls.map(w => w.id === wallId ? { ...w, ...patch } : w) }))) }))
        },

        deleteWall: id => {
          set(s => ({
            design: commit(mapActive(s, f => ({ ...f, walls: f.walls.filter(w => w.id !== id), openings: f.openings.filter(o => o.wallId !== id) }))),
            selectedId: s.selectedId === id ? null : s.selectedId,
          }))
        },

        // ── Openings ───────────────────────────────────────────────────────
        addOpening: (wallId, type) => {
          const floor = get().design.floors.find(f => f.id === get().activeFloorId)
          const wall = floor?.walls.find(w => w.id === wallId)
          if (!wall) return
          const len = wallLength(wall)
          const width = type === 'door' ? 90 : 100
          const height = type === 'door' ? 210 : 120
          const sillHeight = type === 'door' ? 0 : 90
          const offset = Math.max(0, (len - width) / 2)
          const opening: Opening = { id: nanoid(), wallId, type, offset, width, height, sillHeight }
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, openings: [...f.openings, opening] }))), selectedId: opening.id }))
        },

        updateOpening: (id, patch) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, openings: f.openings.map(o => o.id === id ? { ...o, ...patch } : o) }))) }))
        },

        deleteOpening: id => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, openings: f.openings.filter(o => o.id !== id) }))), selectedId: s.selectedId === id ? null : s.selectedId }))
        },

        // ── Furniture ──────────────────────────────────────────────────────
        addFurniture: (kind, position) => {
          const entry = CATALOG_MAP[kind]
          const item: Furniture = { id: nanoid(), kind, position, rotation: 0, size: { ...entry.size }, color: entry.color }
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: [...f.furniture, item] }))), selectedId: item.id }))
        },

        addCustomFurniture: (label, size, color, position) => {
          const item: Furniture = { id: nanoid(), kind: 'custom', position, rotation: 0, size, color, customLabel: label }
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: [...f.furniture, item] }))), selectedId: item.id }))
        },

        moveFurniture: (id, position) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: f.furniture.map(x => x.id === id ? { ...x, position } : x) }))) }))
        },

        rotateFurniture: (id, delta) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: f.furniture.map(x => x.id === id ? { ...x, rotation: x.rotation + delta } : x) }))) }))
        },

        deleteFurniture: id => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: f.furniture.filter(x => x.id !== id) }))), selectedId: s.selectedId === id ? null : s.selectedId }))
        },

        updateFurnitureSize: (id, size) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: f.furniture.map(x => x.id === id ? { ...x, size: { ...x.size, ...size } } : x) }))) }))
        },

        updateFurnitureLabel: (id, label) => {
          set(s => ({ design: commit(mapActive(s, f => ({ ...f, furniture: f.furniture.map(x => x.id === id ? { ...x, customLabel: label } : x) }))) }))
        },

        // ── Persistence ────────────────────────────────────────────────────
        loadDesign: design => {
          saveDesign(design)
          set({ design, activeFloorId: design.floors[0].id, selectedId: null, showWelcome: false })
        },

        newDesign: () => {
          const design = emptyDesign()
          saveDesign(design)
          set({ design, activeFloorId: design.floors[0].id, selectedId: null })
        },

        save: () => saveDesign(get().design),

        openWelcome: () => set({ showWelcome: true }),
        closeWelcome: () => set({ showWelcome: false }),
      }
    },
    { partialize: (s: State & Actions) => ({ design: s.design }) }
  )
)

export const useDesignStore = useDesignStoreBase

/** Reactive hook for undo/redo stacks. */
export function useTemporalStore() {
  return useStore(useDesignStoreBase.temporal)
}

/** The floor currently being edited. */
export function useActiveFloor(): Floor {
  return useDesignStore(s => s.design.floors.find(f => f.id === s.activeFloorId) ?? s.design.floors[0])
}

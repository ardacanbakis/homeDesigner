import { beforeEach, describe, expect, it } from 'vitest'
import { useDesignStore } from './design'

const store = useDesignStore

function reset() {
  // Wipe persisted state and reset by calling newDesign.
  localStorage.clear()
  store.getState().newDesign()
  store.setState({ selectedId: null, selectedIds: [], clipboard: [], activeTool: 'select' })
}

beforeEach(() => {
  reset()
})

describe('design store — walls', () => {
  it('adds a wall to the active floor', () => {
    store.getState().addWall({ x: 0, y: 0 }, { x: 100, y: 0 })
    const floor = store.getState().design.floors[0]
    expect(floor.walls).toHaveLength(1)
    expect(floor.walls[0].a).toEqual({ x: 0, y: 0 })
    expect(floor.walls[0].b).toEqual({ x: 100, y: 0 })
  })

  it('deletes a wall and its openings', () => {
    store.getState().addWall({ x: 0, y: 0 }, { x: 100, y: 0 })
    const wallId = store.getState().design.floors[0].walls[0].id
    store.getState().addOpening(wallId, 'door')
    expect(store.getState().design.floors[0].openings).toHaveLength(1)
    store.getState().deleteWall(wallId)
    const f = store.getState().design.floors[0]
    expect(f.walls).toHaveLength(0)
    expect(f.openings).toHaveLength(0)
  })

  it('setWallLength projects endpoint b along the wall direction', () => {
    store.getState().addWall({ x: 0, y: 0 }, { x: 100, y: 0 })
    const wallId = store.getState().design.floors[0].walls[0].id
    store.getState().setWallLength(wallId, 250)
    const wall = store.getState().design.floors[0].walls[0]
    expect(wall.b.x).toBeCloseTo(250)
    expect(wall.b.y).toBeCloseTo(0)
  })
})

describe('design store — furniture', () => {
  it('adds preset furniture using catalog defaults', () => {
    store.getState().addFurniture('bed', { x: 50, y: 60 })
    const item = store.getState().design.floors[0].furniture[0]
    expect(item.kind).toBe('bed')
    expect(item.position).toEqual({ x: 50, y: 60 })
    expect(item.size.w).toBeGreaterThan(0)
    expect(item.size.h).toBeGreaterThan(0)
  })

  it('rotates furniture by a delta', () => {
    store.getState().addFurniture('chair', { x: 0, y: 0 })
    const id = store.getState().design.floors[0].furniture[0].id
    store.getState().rotateFurniture(id, Math.PI / 2)
    expect(store.getState().design.floors[0].furniture[0].rotation).toBeCloseTo(Math.PI / 2)
  })

  it('duplicateFurniture creates a copy with a new id and selects it', () => {
    store.getState().addFurniture('chair', { x: 10, y: 20 })
    const srcId = store.getState().design.floors[0].furniture[0].id
    store.getState().duplicateFurniture(srcId)
    const items = store.getState().design.floors[0].furniture
    expect(items).toHaveLength(2)
    expect(items[1].id).not.toBe(srcId)
    expect(items[1].position.x).toBeGreaterThan(10) // copy is offset
    expect(store.getState().selectedId).toBe(items[1].id)
  })

  it('nudgeFurniture moves by the given delta', () => {
    store.getState().addFurniture('chair', { x: 100, y: 100 })
    const id = store.getState().design.floors[0].furniture[0].id
    store.getState().nudgeFurniture(id, 5, -5)
    const pos = store.getState().design.floors[0].furniture[0].position
    expect(pos).toEqual({ x: 105, y: 95 })
  })

  it('addCustomFurniture stores the label and applies the size + color', () => {
    store.getState().addCustomFurniture('Piano', { w: 150, d: 60, h: 110 }, '#3b6ea8', { x: 0, y: 0 })
    const item = store.getState().design.floors[0].furniture[0]
    expect(item.kind).toBe('custom')
    expect(item.customLabel).toBe('Piano')
    expect(item.color).toBe('#3b6ea8')
    expect(item.size).toEqual({ w: 150, d: 60, h: 110 })
  })

  it('updateFurnitureColor replaces the color', () => {
    store.getState().addFurniture('chair', { x: 0, y: 0 })
    const id = store.getState().design.floors[0].furniture[0].id
    store.getState().updateFurnitureColor(id, '#ff00ff')
    expect(store.getState().design.floors[0].furniture[0].color).toBe('#ff00ff')
  })
})

describe('design store — multi-selection', () => {
  it('setSelectedIds also primes selectedId with the first entry', () => {
    store.getState().addFurniture('chair', { x: 0, y: 0 })
    store.getState().addFurniture('table', { x: 100, y: 0 })
    const ids = store.getState().design.floors[0].furniture.map(f => f.id)
    store.getState().setSelectedIds(ids)
    expect(store.getState().selectedIds).toEqual(ids)
    expect(store.getState().selectedId).toBe(ids[0])
  })

  it('toggleSelected adds and then removes an id', () => {
    store.getState().addFurniture('chair', { x: 0, y: 0 })
    const id = store.getState().design.floors[0].furniture[0].id
    store.getState().toggleSelected(id)
    expect(store.getState().selectedIds).toContain(id)
    store.getState().toggleSelected(id)
    expect(store.getState().selectedIds).not.toContain(id)
  })

  it('copySelection + pasteClipboard creates offset copies', () => {
    store.getState().addFurniture('chair', { x: 50, y: 50 })
    const id = store.getState().design.floors[0].furniture[0].id
    store.getState().setSelectedIds([id])
    store.getState().copySelection()
    store.getState().pasteClipboard()
    const items = store.getState().design.floors[0].furniture
    expect(items).toHaveLength(2)
    expect(items[1].position.x).toBeGreaterThan(50)
  })

  it('alignSelected("left") aligns all items to the smallest x', () => {
    store.getState().addFurniture('chair', { x: 30, y: 0 })
    store.getState().addFurniture('chair', { x: 70, y: 50 })
    const ids = store.getState().design.floors[0].furniture.map(f => f.id)
    store.getState().setSelectedIds(ids)
    store.getState().alignSelected('left')
    const xs = store.getState().design.floors[0].furniture.map(f => f.position.x)
    expect(xs[0]).toBe(30)
    expect(xs[1]).toBe(30)
  })

  it('distributeSelected spreads centers evenly between first and last', () => {
    // Three items along x with the middle one offset to confirm redistribution.
    store.getState().addFurniture('chair', { x: 0, y: 0 })
    store.getState().addFurniture('chair', { x: 30, y: 0 })
    store.getState().addFurniture('chair', { x: 100, y: 0 })
    const ids = store.getState().design.floors[0].furniture.map(f => f.id)
    store.getState().setSelectedIds(ids)
    store.getState().distributeSelected('horizontal')
    const xs = store.getState().design.floors[0].furniture
      .map(f => f.position.x + f.size.w / 2)
      .sort((a, b) => a - b)
    // Centers should be exactly evenly spaced (50, 50) apart.
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 5)
  })
})

describe('design store — floors', () => {
  it('addFloor switches the active floor to the new one', () => {
    const initialId = store.getState().activeFloorId
    store.getState().addFloor()
    expect(store.getState().design.floors).toHaveLength(2)
    expect(store.getState().activeFloorId).not.toBe(initialId)
  })

  it('deleteFloor refuses to remove the last floor', () => {
    const id = store.getState().activeFloorId
    store.getState().deleteFloor(id)
    expect(store.getState().design.floors).toHaveLength(1)
  })

  it('renameFloor updates the floor name', () => {
    const id = store.getState().activeFloorId
    store.getState().renameFloor(id, 'Penthouse')
    expect(store.getState().design.floors[0].name).toBe('Penthouse')
  })
})

describe('design store — meta', () => {
  it('lastSavedAt advances after a mutation', async () => {
    const before = store.getState().lastSavedAt
    // Wait a hair so the new timestamp is strictly greater.
    await new Promise(r => setTimeout(r, 5))
    store.getState().addWall({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(store.getState().lastSavedAt).toBeGreaterThan(before)
  })

  it('toggleTheme flips between dark and light', () => {
    const before = store.getState().theme
    store.getState().toggleTheme()
    expect(store.getState().theme).not.toBe(before)
    store.getState().toggleTheme()
    expect(store.getState().theme).toBe(before)
  })
})

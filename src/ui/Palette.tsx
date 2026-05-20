import { useState } from 'react'
import { CATALOG } from '../geometry/catalog'
import type { CatalogEntry } from '../geometry/catalog'
import { useDesignStore } from '../store/design'
import type { FurnitureKind } from '../store/types'

const CATEGORIES = ['bedroom', 'kitchen', 'living', 'bathroom', 'office', 'structure'] as const

export function Palette() {
  const { viewMode, addFurniture, setActiveTool } = useDesignStore()
  const [activeCategory, setActiveCategory] = useState<string>('bedroom')
  const [dragging, setDragging] = useState<FurnitureKind | null>(null)

  const items = CATALOG.filter(e => e.category === activeCategory)

  const handleDragStart = (e: React.DragEvent, entry: CatalogEntry) => {
    setDragging(entry.kind)
    e.dataTransfer.setData('furniture-kind', entry.kind)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleClick = (entry: CatalogEntry) => {
    if (viewMode === '2d') {
      // Place at canvas center (Canvas2D listens for this)
      addFurniture(entry.kind, { x: 300, y: 300 })
      setActiveTool('select')
    }
  }

  return (
    <div className="w-52 flex flex-col bg-gray-900 border-r border-gray-700 shrink-0 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700">
        Furniture
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-700">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 text-xs rounded capitalize transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map(entry => (
          <div
            key={entry.kind}
            draggable
            onDragStart={e => handleDragStart(e, entry)}
            onDragEnd={() => setDragging(null)}
            onClick={() => handleClick(entry)}
            className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer select-none transition-colors ${
              dragging === entry.kind
                ? 'bg-blue-700 text-white'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700 active:bg-gray-600'
            }`}
          >
            <span className="text-lg leading-none">{entry.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{entry.label}</div>
              <div className="text-[10px] text-gray-500">
                {entry.size.w}×{entry.size.d} cm
              </div>
            </div>
            <div
              className="w-3 h-3 rounded-sm shrink-0 border border-gray-600"
              style={{ background: entry.color }}
            />
          </div>
        ))}
      </div>

      <div className="px-3 py-2 text-[10px] text-gray-600 border-t border-gray-700">
        Drag or click to place
      </div>
    </div>
  )
}

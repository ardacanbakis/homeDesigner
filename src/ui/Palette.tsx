import { useState } from 'react'
import { CATALOG, type CatalogEntry, type FurnitureCategory } from '../geometry/catalog'
import { useDesignStore } from '../store/design'
import type { FurnitureKind } from '../store/types'

const CATEGORIES: { id: FurnitureCategory; label: string; icon: string }[] = [
  { id: 'bedroom',   label: 'Bedroom',   icon: '🛏️' },
  { id: 'kitchen',   label: 'Kitchen',   icon: '🍳' },
  { id: 'living',    label: 'Living',    icon: '🛋️' },
  { id: 'bathroom',  label: 'Bathroom',  icon: '🚿' },
  { id: 'office',    label: 'Office',    icon: '🖥️' },
  { id: 'structure', label: 'Structure', icon: '🧱' },
]

const PRESET_COLORS = ['#64748b', '#8b5e3c', '#4a7c59', '#3b6ea8', '#8b3a3a', '#7b5ea7', '#a07c3a', '#3a7a7a']

export function Palette() {
  const { viewMode, addFurniture, addCustomFurniture, setActiveTool } = useDesignStore()
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('bedroom')
  const [dragging, setDragging] = useState<FurnitureKind | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customLabel, setCustomLabel] = useState('My Object')
  const [customW, setCustomW] = useState(100)
  const [customD, setCustomD] = useState(80)
  const [customH, setCustomH] = useState(100)
  const [customColor, setCustomColor] = useState('#64748b')

  const items = CATALOG.filter(e => e.category === activeCategory)

  const handleDragStart = (e: React.DragEvent, entry: CatalogEntry) => {
    setDragging(entry.kind)
    e.dataTransfer.setData('furniture-kind', entry.kind)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleClick = (entry: CatalogEntry) => {
    if (viewMode === '2d') {
      addFurniture(entry.kind, { x: 300, y: 300 })
      setActiveTool('select')
    }
  }

  const handleAddCustom = () => {
    if (!customLabel.trim()) return
    addCustomFurniture(customLabel.trim(), { w: customW, d: customD, h: customH }, customColor, { x: 300, y: 300 })
    setActiveTool('select')
    setShowCustomForm(false)
  }

  return (
    <div className="w-[220px] flex flex-col bg-gray-900 border-r border-gray-700/80 shrink-0 overflow-hidden">
      <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b border-gray-700/80">
        Furniture
      </div>

      {/* Category tabs — 3-column grid */}
      <div className="grid grid-cols-3 gap-1 p-2 border-b border-gray-700/80">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            title={cat.label}
            className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <span className="text-base leading-none">{cat.icon}</span>
            <span className="leading-none truncate w-full text-center">{cat.label}</span>
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
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer select-none transition-colors ${
              dragging === entry.kind
                ? 'bg-blue-700 text-white'
                : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700 active:bg-gray-600'
            }`}
          >
            <span className="text-xl leading-none shrink-0">{entry.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{entry.label}</div>
              <div className="text-[10px] text-gray-500 font-mono">
                {entry.size.w}×{entry.size.d}×{entry.size.h}cm
              </div>
            </div>
            <div className="w-3 h-3 rounded-sm shrink-0 border border-gray-600/80" style={{ background: entry.color }} />
          </div>
        ))}
      </div>

      {/* Custom object panel */}
      <div className="border-t border-gray-700/80 p-2">
        <button
          onClick={() => setShowCustomForm(v => !v)}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-xs font-medium"
        >
          <span className="text-base">📦</span>
          <span className="flex-1 text-left">Custom Object</span>
          <span className="text-gray-500 text-[10px]">{showCustomForm ? '▲' : '▼'}</span>
        </button>

        {showCustomForm && (
          <div className="mt-2 space-y-2.5 p-2.5 bg-gray-800/60 rounded-lg border border-gray-700/60">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Name</label>
              <input
                type="text"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder="Piano, Pool Table…"
                className="w-full bg-gray-900 text-gray-200 text-xs px-2 py-1.5 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 placeholder-gray-600"
                maxLength={32}
                onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Dimensions (cm)</label>
              <div className="grid grid-cols-3 gap-1">
                {([['W', customW, setCustomW], ['D', customD, setCustomD], ['H', customH, setCustomH]] as [string, number, (v: number) => void][]).map(
                  ([lbl, val, setter]) => (
                    <div key={lbl}>
                      <div className="text-[9px] text-gray-500 text-center mb-0.5">{lbl}</div>
                      <input
                        type="number"
                        value={val}
                        onChange={e => setter(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-gray-900 text-gray-200 text-xs px-1 py-1 rounded border border-gray-600 text-center focus:outline-none focus:border-blue-500 font-mono"
                        min={1} max={2000}
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Color</label>
              <div className="flex gap-1 flex-wrap items-center">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCustomColor(c)}
                    className={`w-5 h-5 rounded border-2 transition-all ${customColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0" title="Custom color" />
              </div>
            </div>

            <button
              onClick={handleAddCustom}
              disabled={!customLabel.trim()}
              className="w-full py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
            >
              Add to Canvas
            </button>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 text-[10px] text-gray-600 border-t border-gray-700/80">
        Drag or click to place
      </div>
    </div>
  )
}

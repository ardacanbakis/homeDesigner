import { useEffect } from 'react'
import { useDesignStore, useTemporalStore, useActiveFloor } from '../store/design'
import { exportJSON, importJSON } from '../persistence/storage'

export function Toolbar() {
  const {
    viewMode, setViewMode, activeTool, setActiveTool, loadDesign, design,
    snapEnabled, toggleSnap, undo, redo,
    activeFloorId, setActiveFloor, addFloor, deleteFloor,
    openWelcome,
  } = useDesignStore()
  const floor = useActiveFloor()
  const { pastStates, futureStates } = useTemporalStore()
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  const handleExport = () => exportJSON(design)
  const handleImport = async () => {
    const d = await importJSON()
    if (d) loadDesign(d)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key === 'z') { e.preventDefault(); undo() }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700/80 h-12 shrink-0">
      <span className="text-white font-semibold mr-1 text-sm tracking-wide select-none">🏠 HomeDesigner</span>
      <div className="w-px h-5 bg-gray-700 mx-0.5" />

      {/* 2D / 3D toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs font-semibold">
        {(['2d', '3d'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 uppercase transition-colors ${
              viewMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >{mode}</button>
        ))}
      </div>

      {/* 2D drawing tools */}
      {viewMode === '2d' && (
        <>
          <div className="w-px h-5 bg-gray-700 mx-0.5" />
          <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs font-medium">
            <button onClick={() => setActiveTool('select')} title="Select (V)"
              className={`px-3 py-1.5 transition-colors ${activeTool === 'select' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >↖ Select</button>
            <button onClick={() => setActiveTool('wall')} title="Draw Wall (W)"
              className={`px-3 py-1.5 transition-colors ${activeTool === 'wall' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
            >▭ Wall</button>
          </div>
          <button onClick={toggleSnap} title="Toggle grid snap"
            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
              snapEnabled
                ? 'border-green-600/60 text-green-400 bg-green-900/20'
                : 'border-gray-700 text-gray-500 bg-gray-800 hover:text-gray-300'
            }`}
          >⊞ Snap</button>
        </>
      )}

      {/* Floor switcher */}
      <div className="w-px h-5 bg-gray-700 mx-0.5" />
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Floor</span>
        <select
          value={activeFloorId}
          onChange={e => setActiveFloor(e.target.value)}
          className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded-lg border border-gray-700 max-w-32 focus:outline-none"
        >
          {design.floors.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button onClick={addFloor} title="Add floor" className="px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg border border-gray-700">+</button>
        <button
          onClick={() => { if (design.floors.length > 1 && confirm(`Delete "${floor.name}"?`)) deleteFloor(activeFloorId) }}
          disabled={design.floors.length <= 1}
          title="Delete floor"
          className={`px-2 py-1 text-xs rounded-lg border ${
            design.floors.length > 1
              ? 'bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 border-gray-700'
              : 'bg-gray-900 text-gray-700 border-gray-800 cursor-not-allowed'
          }`}
        >🗑</button>
      </div>

      {/* Undo / Redo */}
      <div className="w-px h-5 bg-gray-700 mx-0.5" />
      <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs font-medium">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className={`px-3 py-1.5 transition-colors ${canUndo ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
        >↩ Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
          className={`px-3 py-1.5 transition-colors ${canRedo ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
        >↪ Redo</button>
      </div>

      <div className="flex-1" />

      {/* File ops */}
      <div className="flex items-center gap-1.5">
        <button onClick={handleExport} className="px-2.5 py-1.5 text-xs bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">↓ Export</button>
        <button onClick={handleImport} className="px-2.5 py-1.5 text-xs bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">↑ Import</button>
        <button onClick={openWelcome} className="px-2.5 py-1.5 text-xs bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">New</button>
      </div>

      <div className="text-[10px] text-gray-600 font-mono tabular-nums ml-1">
        {floor.walls.length}w · {floor.furniture.length}f
      </div>
    </div>
  )
}

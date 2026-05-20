import { useEffect } from 'react'
import { useDesignStore, useTemporalStore } from '../store/design'
import { exportJSON, importJSON } from '../persistence/storage'

export function Toolbar() {
  const { viewMode, setViewMode, activeTool, setActiveTool, newDesign, loadDesign, design, snapEnabled, toggleSnap, undo, redo } =
    useDesignStore()
  const { pastStates, futureStates } = useTemporalStore()
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  const handleNew = () => {
    if (confirm('Start a new design? Unsaved changes will be lost.')) newDesign()
  }

  const handleExport = () => exportJSON(design)
  const handleImport = async () => {
    const d = await importJSON()
    if (d) loadDesign(d)
  }

  // Global keyboard shortcuts
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
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700 h-12 shrink-0">
      <span className="text-white font-semibold mr-2 text-sm tracking-wide">🏠 HomeDesigner</span>

      {/* View mode */}
      <div className="flex rounded overflow-hidden border border-gray-600">
        {(['2d', '3d'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)}
            className={`px-3 py-1 text-xs font-medium transition-colors uppercase ${
              viewMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >{mode}</button>
        ))}
      </div>

      {/* 2D tools */}
      {viewMode === '2d' && (
        <>
          <div className="w-px h-6 bg-gray-600 mx-1" />
          <div className="flex rounded overflow-hidden border border-gray-600">
            <button onClick={() => setActiveTool('select')} title="Select (V)"
              className={`px-3 py-1 text-xs font-medium transition-colors ${activeTool === 'select' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >↖ Select</button>
            <button onClick={() => setActiveTool('wall')} title="Draw Wall (W)"
              className={`px-3 py-1 text-xs font-medium transition-colors ${activeTool === 'wall' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >▭ Wall</button>
          </div>
          <button onClick={toggleSnap} title="Toggle grid snap"
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              snapEnabled ? 'border-green-500 text-green-400 bg-green-900/30' : 'border-gray-600 text-gray-400 bg-gray-800'
            }`}
          >⊞ Snap {snapEnabled ? 'ON' : 'OFF'}</button>
        </>
      )}

      {/* Undo / Redo */}
      <div className="w-px h-6 bg-gray-600 mx-1" />
      <div className="flex rounded overflow-hidden border border-gray-600">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className={`px-3 py-1 text-xs font-medium transition-colors ${canUndo ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
        >↩ Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
          className={`px-3 py-1 text-xs font-medium transition-colors ${canRedo ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-900 text-gray-600 cursor-not-allowed'}`}
        >↪ Redo</button>
      </div>

      <div className="flex-1" />

      {/* File ops */}
      <button onClick={handleExport} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600">↓ Export</button>
      <button onClick={handleImport} className="px-3 py-1 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600">↑ Import</button>
      <button onClick={handleNew} className="px-3 py-1 text-xs bg-red-900/50 text-red-300 hover:bg-red-900/70 rounded border border-red-700">New</button>

      <div className="text-xs text-gray-600 ml-1">
        {design.walls.length}w · {design.openings.length}o · {design.furniture.length}f
      </div>
    </div>
  )
}

import { useDesignStore } from '../store/design'
import { exportJSON, importJSON } from '../persistence/storage'

export function Toolbar() {
  const { viewMode, setViewMode, activeTool, setActiveTool, newDesign, loadDesign, design, snapEnabled, toggleSnap } =
    useDesignStore()

  const handleNew = () => {
    if (confirm('Start a new design? Unsaved changes will be lost.')) newDesign()
  }

  const handleExport = () => exportJSON(design)

  const handleImport = async () => {
    const d = await importJSON()
    if (d) loadDesign(d)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700 h-12 shrink-0">
      <span className="text-white font-semibold mr-4 text-sm tracking-wide">🏠 HomeDesigner</span>

      {/* View mode toggle */}
      <div className="flex rounded overflow-hidden border border-gray-600">
        <button
          onClick={() => setViewMode('2d')}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          2D
        </button>
        <button
          onClick={() => setViewMode('3d')}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          3D
        </button>
      </div>

      {/* Tools (2D only) */}
      {viewMode === '2d' && (
        <>
          <div className="w-px h-6 bg-gray-600 mx-1" />
          <div className="flex rounded overflow-hidden border border-gray-600">
            <button
              onClick={() => setActiveTool('select')}
              title="Select (V)"
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTool === 'select' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ↖ Select
            </button>
            <button
              onClick={() => setActiveTool('wall')}
              title="Draw Wall (W)"
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTool === 'wall' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ▭ Wall
            </button>
          </div>

          <button
            onClick={toggleSnap}
            title="Toggle grid snap"
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              snapEnabled
                ? 'border-green-500 text-green-400 bg-green-900/30'
                : 'border-gray-600 text-gray-400 bg-gray-800'
            }`}
          >
            ⊞ Snap {snapEnabled ? 'ON' : 'OFF'}
          </button>
        </>
      )}

      <div className="flex-1" />

      {/* File ops */}
      <button
        onClick={handleExport}
        className="px-3 py-1 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600 transition-colors"
      >
        ↓ Export
      </button>
      <button
        onClick={handleImport}
        className="px-3 py-1 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600 transition-colors"
      >
        ↑ Import
      </button>
      <button
        onClick={handleNew}
        className="px-3 py-1 text-xs bg-red-900/50 text-red-300 hover:bg-red-900/70 rounded border border-red-700 transition-colors"
      >
        New
      </button>

      <div className="text-xs text-gray-500 ml-2">
        {design.walls.length}w / {design.furniture.length}f
      </div>
    </div>
  )
}

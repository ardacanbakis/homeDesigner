import { useDesignStore } from '../store/design'
import { CATALOG_MAP } from '../geometry/catalog'
import { wallLength } from '../geometry/walls'

export function Inspector() {
  const { design, selectedId, setSelected, deleteWall, deleteFurniture, rotateFurniture, updateFurnitureSize } =
    useDesignStore()

  const wall = design.walls.find(w => w.id === selectedId)
  const furniture = design.furniture.find(f => f.id === selectedId)

  if (!selectedId || (!wall && !furniture)) {
    return (
      <div className="w-56 bg-gray-900 border-l border-gray-700 shrink-0 flex flex-col">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700">
          Inspector
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-gray-600 p-4 text-center">
          Click to select<br />a wall or furniture
        </div>
        <div className="px-3 py-2 text-[10px] text-gray-600 border-t border-gray-700 space-y-0.5">
          <div>V — select tool</div>
          <div>W — wall tool</div>
          <div>R — rotate 90°</div>
          <div>Del — delete</div>
          <div>Ctrl+Z — undo (soon)</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 shrink-0 flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 flex justify-between items-center">
        <span>Inspector</span>
        <button
          onClick={() => setSelected(null)}
          className="text-gray-500 hover:text-gray-300 text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {wall && (
          <>
            <div>
              <div className="text-xs font-medium text-gray-300 mb-1">Wall</div>
              <Row label="Length" value={`${Math.round(wallLength(wall))} cm`} />
              <Row label="Height" value={`${wall.height} cm`} />
              <Row label="Thickness" value={`${wall.thickness} cm`} />
              <Row label="Start" value={`${Math.round(wall.a.x)}, ${Math.round(wall.a.y)}`} />
              <Row label="End" value={`${Math.round(wall.b.x)}, ${Math.round(wall.b.y)}`} />
            </div>
            <button
              onClick={() => { deleteWall(wall.id); setSelected(null) }}
              className="w-full px-2 py-1.5 text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded border border-red-700 transition-colors"
            >
              Delete Wall
            </button>
          </>
        )}

        {furniture && (
          <>
            <div>
              <div className="text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                <span>{CATALOG_MAP[furniture.kind].icon}</span>
                <span>{CATALOG_MAP[furniture.kind].label}</span>
              </div>
              <Row label="X" value={`${Math.round(furniture.position.x)} cm`} />
              <Row label="Y" value={`${Math.round(furniture.position.y)} cm`} />
              <Row label="Rotation" value={`${Math.round((furniture.rotation * 180) / Math.PI)}°`} />
            </div>

            <div>
              <div className="text-xs font-medium text-gray-400 mb-1">Size (cm)</div>
              <div className="grid grid-cols-3 gap-1">
                {(['w', 'd', 'h'] as const).map(dim => (
                  <div key={dim}>
                    <div className="text-[10px] text-gray-500 text-center">{dim.toUpperCase()}</div>
                    <input
                      type="number"
                      value={furniture.size[dim]}
                      onChange={e => updateFurnitureSize(furniture.id, { [dim]: Number(e.target.value) })}
                      className="w-full bg-gray-800 text-gray-200 text-xs px-1 py-1 rounded border border-gray-600 text-center"
                      min={1}
                      max={999}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => rotateFurniture(furniture.id, Math.PI / 2)}
                className="flex-1 px-2 py-1.5 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600 transition-colors"
              >
                ↻ 90°
              </button>
              <button
                onClick={() => { deleteFurniture(furniture.id); setSelected(null) }}
                className="flex-1 px-2 py-1.5 text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded border border-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-mono">{value}</span>
    </div>
  )
}

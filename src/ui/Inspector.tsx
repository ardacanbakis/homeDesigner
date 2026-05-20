import { useDesignStore } from '../store/design'
import { CATALOG_MAP } from '../geometry/catalog'
import { wallLength } from '../geometry/walls'

export function Inspector() {
  const {
    design, selectedId, setSelected,
    deleteWall, addOpening, updateOpening, deleteOpening,
    deleteFurniture, rotateFurniture, updateFurnitureSize,
  } = useDesignStore()

  const wall = design.walls.find(w => w.id === selectedId)
  const opening = design.openings.find(o => o.id === selectedId)
  const furniture = design.furniture.find(f => f.id === selectedId)

  if (!selectedId || (!wall && !opening && !furniture)) {
    return (
      <div className="w-56 bg-gray-900 border-l border-gray-700 shrink-0 flex flex-col">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700">
          Inspector
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-gray-600 p-4 text-center">
          Click to select a wall, opening, or furniture
        </div>
        <KeyHints />
      </div>
    )
  }

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-700 shrink-0 flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 flex justify-between items-center">
        <span>Inspector</span>
        <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── Wall ─────────────────────────────────────────────── */}
        {wall && (
          <>
            <Section label="Wall">
              <Row label="Length" value={`${Math.round(wallLength(wall))} cm`} />
              <Row label="Height" value={`${wall.height} cm`} />
              <Row label="Thickness" value={`${wall.thickness} cm`} />
            </Section>

            <Section label="Openings">
              <div className="flex gap-1">
                <button
                  onClick={() => addOpening(wall.id, 'door')}
                  className="flex-1 py-1.5 text-xs bg-gray-800 text-gray-200 hover:bg-gray-700 rounded border border-gray-600"
                >
                  🚪 Door
                </button>
                <button
                  onClick={() => addOpening(wall.id, 'window')}
                  className="flex-1 py-1.5 text-xs bg-gray-800 text-gray-200 hover:bg-gray-700 rounded border border-gray-600"
                >
                  🪟 Window
                </button>
              </div>
              {design.openings.filter(o => o.wallId === wall.id).map(op => (
                <div
                  key={op.id}
                  onClick={() => setSelected(op.id)}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs text-gray-300"
                >
                  <span>{op.type === 'door' ? '🚪' : '🪟'}</span>
                  <span className="capitalize">{op.type}</span>
                  <span className="text-gray-500 ml-auto">{op.width}cm</span>
                </div>
              ))}
            </Section>

            <button
              onClick={() => { deleteWall(wall.id); setSelected(null) }}
              className="w-full px-2 py-1.5 text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded border border-red-700"
            >
              Delete Wall
            </button>
          </>
        )}

        {/* ── Opening ──────────────────────────────────────────── */}
        {opening && (() => {
          const parentWall = design.walls.find(w => w.id === opening.wallId)
          const maxOffset = parentWall ? Math.max(0, wallLength(parentWall) - opening.width) : 9999
          return (
            <>
              <Section label={`${opening.type === 'door' ? '🚪 Door' : '🪟 Window'}`}>
                <Row label="Type" value={opening.type} />
              </Section>

              <Section label="Position & Size">
                <NumberField
                  label="Offset (cm)" value={opening.offset} min={0} max={maxOffset}
                  onChange={v => updateOpening(opening.id, { offset: v })}
                />
                <NumberField
                  label="Width (cm)" value={opening.width} min={20} max={500}
                  onChange={v => updateOpening(opening.id, { width: v })}
                />
                <NumberField
                  label="Height (cm)" value={opening.height} min={20} max={300}
                  onChange={v => updateOpening(opening.id, { height: v })}
                />
                {opening.type === 'window' && (
                  <NumberField
                    label="Sill (cm)" value={opening.sillHeight} min={0} max={200}
                    onChange={v => updateOpening(opening.id, { sillHeight: v })}
                  />
                )}
              </Section>

              <div className="flex gap-1">
                <button
                  onClick={() => { setSelected(opening.wallId) }}
                  className="flex-1 px-2 py-1.5 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600"
                >
                  ← Wall
                </button>
                <button
                  onClick={() => { deleteOpening(opening.id) }}
                  className="flex-1 px-2 py-1.5 text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded border border-red-700"
                >
                  Delete
                </button>
              </div>
            </>
          )
        })()}

        {/* ── Furniture ────────────────────────────────────────── */}
        {furniture && (
          <>
            <Section label={`${CATALOG_MAP[furniture.kind].icon} ${CATALOG_MAP[furniture.kind].label}`}>
              <Row label="X" value={`${Math.round(furniture.position.x)} cm`} />
              <Row label="Y" value={`${Math.round(furniture.position.y)} cm`} />
              <Row label="Rotation" value={`${Math.round((furniture.rotation * 180) / Math.PI)}°`} />
            </Section>

            <Section label="Size (cm)">
              <div className="grid grid-cols-3 gap-1">
                {(['w', 'd', 'h'] as const).map(dim => (
                  <div key={dim}>
                    <div className="text-[10px] text-gray-500 text-center mb-0.5">{dim.toUpperCase()}</div>
                    <input
                      type="number"
                      value={furniture.size[dim]}
                      onChange={e => updateFurnitureSize(furniture.id, { [dim]: Number(e.target.value) })}
                      className="w-full bg-gray-800 text-gray-200 text-xs px-1 py-1 rounded border border-gray-600 text-center"
                      min={1} max={999}
                    />
                  </div>
                ))}
              </div>
            </Section>

            <div className="flex gap-1">
              <button
                onClick={() => rotateFurniture(furniture.id, Math.PI / 2)}
                className="flex-1 px-2 py-1.5 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600"
              >
                ↻ 90°
              </button>
              <button
                onClick={() => { deleteFurniture(furniture.id); setSelected(null) }}
                className="flex-1 px-2 py-1.5 text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded border border-red-700"
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="space-y-0.5">{children}</div>
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

function NumberField({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20 bg-gray-800 text-gray-200 text-xs px-1.5 py-0.5 rounded border border-gray-600 text-right font-mono"
      />
    </div>
  )
}

function KeyHints() {
  return (
    <div className="px-3 py-2 text-[10px] text-gray-600 border-t border-gray-700 space-y-0.5">
      <div>V — select · W — wall</div>
      <div>R — rotate 90° · Del — delete</div>
      <div>Ctrl+Z — undo · Ctrl+Y — redo</div>
    </div>
  )
}

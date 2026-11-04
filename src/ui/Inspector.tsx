import { useEffect, useMemo, useRef, useState } from 'react'
import { useDesignStore, useActiveFloor } from '../store/design'
import { CATALOG_MAP, FLOOR_MATERIALS } from '../geometry/catalog'
import { wallLength } from '../geometry/walls'
import { formatLength, formatArea, footprintAABB } from '../geometry/measure'
import { deriveRooms, roomAt, tagForRoom, classifyRoom, roomColor, pointInPolygon } from '../geometry/rooms'
import type { FloorMaterial, Vec2 } from '../store/types'
import { LengthField } from './LengthField'

const FURNITURE_COLORS = ['#8B7355', '#6B5B45', '#778899', '#2F2F2F', '#B0C4DE', '#4a7c59', '#3b6ea8', '#8b3a3a', '#f5f5f5']

/** Normalize radians to a whole-degree angle in [0, 360). */
const toDeg = (rad: number) => ((Math.round((rad * 180) / Math.PI) % 360) + 360) % 360

export function Inspector() {
  const {
    selectedId, setSelected,
    deleteWall, setWallLength, updateWall, addOpening, updateOpening, deleteOpening,
    deleteFurniture, rotateFurniture, updateFurnitureSize, updateFurnitureLabel,
    updateFurnitureColor, duplicateFurniture, transformFurniture, units,
    selectedRoomAt, selectRoom,
  } = useDesignStore()
  const floor = useActiveFloor()

  const wall = floor.walls.find(w => w.id === selectedId)
  const opening = floor.openings.find(o => o.id === selectedId)
  const furniture = floor.furniture.find(f => f.id === selectedId)

  if (!selectedId && selectedRoomAt) {
    return (
      <div className="w-56 bg-gray-900 light:bg-white border-l border-gray-700/80 light:border-gray-200 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-gray-300 light:text-gray-700 uppercase tracking-widest border-b border-gray-700/80 light:border-gray-200">
          <span className="w-1 h-3 rounded-sm bg-cyan-400" />
          <span className="flex-1">Inspector</span>
          <button onClick={() => selectRoom(null)} aria-label="Close inspector" className="text-gray-500 hover:text-white light:hover:text-gray-900 text-sm leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <RoomPanel at={selectedRoomAt} />
        </div>
        <KeyHints />
      </div>
    )
  }

  if (!selectedId || (!wall && !opening && !furniture)) {
    return (
      <div className="w-56 bg-gray-900 light:bg-white border-l border-gray-700/80 light:border-gray-200 shrink-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-gray-300 light:text-gray-700 uppercase tracking-widest border-b border-gray-700/80 light:border-gray-200">
          <span className="w-1 h-3 rounded-sm bg-cyan-400" />
          Inspector
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-600 p-6 text-center gap-2">
          <div className="text-3xl opacity-40">↖</div>
          <div>Click a wall, opening, piece<br />of furniture or a room</div>
        </div>
        <KeyHints />
      </div>
    )
  }

  return (
    <div className="w-56 bg-gray-900 light:bg-white border-l border-gray-700/80 light:border-gray-200 shrink-0 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-gray-300 light:text-gray-700 uppercase tracking-widest border-b border-gray-700/80 light:border-gray-200">
        <span className="w-1 h-3 rounded-sm bg-cyan-400" />
        <span className="flex-1">Inspector</span>
        <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white light:hover:text-gray-900 text-sm leading-none">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── Wall ─────────────────────────────────────────────── */}
        {wall && (
          <>
            <Section label="Wall">
              <LengthRow
                label="Length" value={Math.round(wallLength(wall))} min={1} max={5000}
                onChange={v => setWallLength(wall.id, v)}
              />
              <LengthRow
                label="Height" value={wall.height} min={50} max={600}
                onChange={v => updateWall(wall.id, { height: v })}
              />
              <LengthRow
                label="Thickness" value={wall.thickness} min={2} max={100}
                onChange={v => updateWall(wall.id, { thickness: v })}
              />
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
              {floor.openings.filter(o => o.wallId === wall.id).map(op => (
                <div
                  key={op.id}
                  onClick={() => setSelected(op.id)}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs text-gray-300"
                >
                  <span>{op.type === 'door' ? '🚪' : '🪟'}</span>
                  <span className="capitalize">{op.type}</span>
                  <span className="text-gray-500 ml-auto">{formatLength(op.width, units)}</span>
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
          const parentWall = floor.walls.find(w => w.id === opening.wallId)
          const maxOffset = parentWall ? Math.max(0, wallLength(parentWall) - opening.width) : 9999
          return (
            <>
              <Section label={`${opening.type === 'door' ? '🚪 Door' : '🪟 Window'}`}>
                <Row label="Type" value={opening.type} />
              </Section>

              <Section label="Position & Size">
                <LengthRow
                  label="Offset" value={opening.offset} min={0} max={maxOffset}
                  onChange={v => updateOpening(opening.id, { offset: v })}
                />
                <LengthRow
                  label="Width" value={opening.width} min={20} max={500}
                  onChange={v => updateOpening(opening.id, { width: v })}
                />
                <LengthRow
                  label="Height" value={opening.height} min={20} max={300}
                  onChange={v => updateOpening(opening.id, { height: v })}
                />
                {opening.type === 'window' && (
                  <LengthRow
                    label="Sill" value={opening.sillHeight} min={0} max={200}
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
            <Section label={
              furniture.kind === 'custom'
                ? `📦 ${furniture.customLabel ?? 'Custom'}`
                : `${CATALOG_MAP[furniture.kind].icon} ${CATALOG_MAP[furniture.kind].label}`
            }>
              {furniture.kind === 'custom' && (
                <div className="mb-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-0.5">Name</label>
                  <input
                    type="text"
                    value={furniture.customLabel ?? ''}
                    onChange={e => updateFurnitureLabel(furniture.id, e.target.value)}
                    maxLength={32}
                    className="w-full bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
              {/* Where the item visibly sits (its footprint's top-left), which for a
                  rotated piece differs from the stored, unrotated corner. */}
              <Row label="X" value={formatLength(footprintAABB(furniture).x0, units)} />
              <Row label="Y" value={formatLength(footprintAABB(furniture).y0, units)} />
              <div className="flex justify-between items-center text-xs py-0.5">
                <span className="text-gray-500">Rotation</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => rotateFurniture(furniture.id, -Math.PI / 12)}
                    title="Rotate −15°"
                    className="px-1 text-gray-400 hover:text-cyan-300"
                  >⟲</button>
                  <input
                    type="number"
                    value={toDeg(furniture.rotation)}
                    onChange={e => {
                      const deg = Number(e.target.value)
                      if (Number.isFinite(deg)) transformFurniture(furniture.id, { rotation: (deg * Math.PI) / 180 })
                    }}
                    step={15}
                    className="w-12 bg-gray-800 text-gray-200 text-xs px-1 py-0.5 rounded border border-gray-600 text-right font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-gray-500">°</span>
                  <button
                    onClick={() => rotateFurniture(furniture.id, Math.PI / 12)}
                    title="Rotate +15°"
                    className="px-1 text-gray-400 hover:text-cyan-300"
                  >⟳</button>
                </div>
              </div>
            </Section>

            <Section label="Size">
              <div className="grid grid-cols-3 gap-1">
                {(['w', 'd', 'h'] as const).map(dim => (
                  <div key={dim}>
                    <div className="text-[10px] text-gray-500 text-center mb-0.5">{dim.toUpperCase()}</div>
                    <LengthField
                      value={furniture.size[dim]}
                      onChange={v => updateFurnitureSize(furniture.id, { [dim]: v })}
                      max={2000}
                      className="w-full text-center px-0.5"
                    />
                  </div>
                ))}
              </div>
            </Section>

            <Section label="Color">
              <div className="flex items-center gap-1.5 flex-wrap">
                {FURNITURE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => updateFurnitureColor(furniture.id, c)}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      (furniture.color ?? '').toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={furniture.color ?? '#888888'}
                  onChange={e => updateFurnitureColor(furniture.id, e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  title="Custom color"
                />
              </div>
            </Section>

            <div className="flex gap-1">
              <button
                onClick={() => rotateFurniture(furniture.id, Math.PI / 2)}
                className="flex-1 px-2 py-1.5 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600"
                title="Rotate 90° (R)"
              >
                ↻ 90°
              </button>
              <button
                onClick={() => duplicateFurniture(furniture.id)}
                className="flex-1 px-2 py-1.5 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600"
                title="Duplicate (Ctrl+D)"
              >
                ⧉ Duplicate
              </button>
            </div>
            <button
              onClick={() => { deleteFurniture(furniture.id); setSelected(null) }}
              className="w-full px-2 py-1.5 text-xs bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded border border-red-700"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Name, size and floor finish of the room containing `at`. */
function RoomPanel({ at }: { at: Vec2 }) {
  const floor = useActiveFloor()
  const { setRoomTag, units } = useDesignStore()
  const rooms = useMemo(() => deriveRooms(floor.walls), [floor.walls])
  const room = roomAt(rooms, at)
  if (!room) {
    return <div className="text-xs text-gray-500 text-center py-6">This room no longer exists.</div>
  }
  const tag = tagForRoom(room, rooms, floor.roomTags)
  const auto = classifyRoom(room, floor.furniture)
  const perimeter = room.vertices.reduce((sum, v, i) => {
    const n = room.vertices[(i + 1) % room.vertices.length]
    return sum + Math.hypot(n.x - v.x, n.y - v.y)
  }, 0)
  const pieces = floor.furniture.filter(f =>
    pointInPolygon({ x: f.position.x + f.size.w / 2, y: f.position.y + f.size.d / 2 }, room.vertices)).length
  const current = tag?.material ?? null
  const swatches: { id: FloorMaterial | null; label: string; color: string }[] = [
    { id: null, label: 'Auto', color: roomColor(room.id) },
    ...(Object.entries(FLOOR_MATERIALS) as [FloorMaterial, (typeof FLOOR_MATERIALS)[FloorMaterial]][])
      .map(([id, m]) => ({ id, label: m.label, color: m.color })),
  ]

  return (
    <>
      <Section label="Room">
        <div className="text-[10px] text-gray-500 mb-1">Name</div>
        <RoomNameField key={room.id} value={tag?.name ?? ''} placeholder={auto} onCommit={name => setRoomTag(at, { name })} />
        <div className="pt-1.5" />
        <Row label="Area" value={formatArea(room.area, units)} />
        <Row label="Perimeter" value={formatLength(perimeter, units)} />
        <Row label="Furniture" value={String(pieces)} />
      </Section>

      <Section label="Floor finish">
        <div className="grid grid-cols-3 gap-1">
          {swatches.map(sw => (
            <button
              key={sw.label}
              onClick={() => setRoomTag(at, { material: sw.id })}
              aria-pressed={current === sw.id}
              className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border text-[10px] transition-colors ${
                current === sw.id
                  ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200 light:text-cyan-700'
                  : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              <span
                className="w-6 h-4 rounded-sm border border-black/20"
                style={{ background: sw.color, opacity: sw.id ? 1 : 0.55 }}
              />
              {sw.label}
            </button>
          ))}
        </div>
      </Section>

      {tag && (
        <button
          onClick={() => setRoomTag(at, { name: '', material: null })}
          className="w-full px-2 py-1.5 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 rounded border border-gray-600"
        >
          Reset to automatic
        </button>
      )}
      <div className="text-[10px] text-gray-600 leading-relaxed">
        Tip: double-click any room on the plan to rename it.
      </div>
    </>
  )
}

/** Text field that commits on Enter/blur (one undo step), Esc reverts. Focuses
 *  itself when the plan asks to rename a room (double-click). */
function RoomNameField({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null) // null = not editing
  const cancelled = useRef(false)
  const ref = useRef<HTMLInputElement>(null)
  const pending = useDesignStore(s => s.renameRoomPending)
  const clearPending = useDesignStore(s => s.clearRenameRoom)
  // The request may arrive before this field mounts, so it lives in the store.
  useEffect(() => {
    if (!pending) return
    ref.current?.focus()
    ref.current?.select()
    clearPending()
  }, [pending, clearPending])
  return (
    <input
      ref={ref}
      type="text"
      value={draft ?? value}
      placeholder={placeholder}
      maxLength={40}
      onFocus={() => setDraft(value)}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && !cancelled.current && draft.trim() !== value) onCommit(draft)
        cancelled.current = false
        setDraft(null)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
      }}
      className="w-full bg-gray-800 text-gray-100 text-sm font-semibold px-2 py-1.5 rounded-lg border border-gray-600 focus:outline-none focus:border-cyan-500 placeholder:text-gray-500 placeholder:font-normal"
    />
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

function LengthRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-gray-500">{label}</span>
      <LengthField value={value} min={min} max={max} onChange={onChange} className="w-24 text-right" />
    </div>
  )
}

function KeyHints() {
  return (
    <div className="px-3 py-2 text-[10px] text-gray-600 border-t border-gray-700 space-y-0.5">
      <div>V — select · W — wall · M — measure</div>
      <div>R — rotate 90° · drag ↻ handle to free-rotate</div>
      <div>F — fit · Shift-click — multi-select</div>
      <div>Ctrl+C/V/D — copy/paste/dup</div>
      <div>Arrows — nudge · Del — delete</div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useDesignStore, useTemporalStore, useActiveFloor } from '../store/design'
import { exportJSON, importJSON } from '../persistence/storage'
import { deriveRooms } from '../geometry/rooms'
import { saveUserTemplate } from '../persistence/templates'

export function Toolbar() {
  const {
    viewMode, setViewMode, activeTool, setActiveTool, loadDesign, design,
    snapEnabled, toggleSnap, undo, redo,
    activeFloorId, setActiveFloor, addFloor, deleteFloor,
    openWelcome, openTemplatePicker,
    theme, toggleTheme, lastSavedAt,
  } = useDesignStore()
  const floor = useActiveFloor()
  const { pastStates, futureStates } = useTemporalStore()
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0
  const rooms = useMemo(() => deriveRooms(floor.walls), [floor.walls])

  // Tick once per second so "Saved Xs ago" stays current.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const savedLabel = useMemo(() => {
    const dt = Math.max(0, Math.floor((now - lastSavedAt) / 1000))
    if (dt < 3) return 'Saved'
    if (dt < 60) return `Saved ${dt}s ago`
    if (dt < 3600) return `Saved ${Math.floor(dt / 60)}m ago`
    return 'Saved'
  }, [now, lastSavedAt])

  const handleExport = () => exportJSON(design)
  const handleImport = async () => {
    const d = await importJSON()
    if (d) loadDesign(d)
  }
  const handleSaveAsTemplate = () => {
    const name = prompt('Save current design as a template — name:')
    if (!name || !name.trim()) return
    saveUserTemplate(name.trim(), design)
    alert(`Saved "${name.trim()}" to My Templates.`)
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

  // Shared visual tokens ─ segmented pill group + borderless ghost buttons
  const seg = 'flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-800/80 light:bg-gray-100 border border-gray-700/50 light:border-gray-200'
  const segBtn = (active: boolean, extra = '') =>
    `px-3 py-1 rounded-md text-xs font-semibold transition-all ${
      active
        ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
        : `text-gray-400 light:text-gray-500 hover:text-white light:hover:text-gray-900 ${extra}`
    }`
  const ghost = 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 light:text-gray-600 hover:text-white light:hover:text-gray-900 hover:bg-gray-800 light:hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400'
  const divider = <div className="w-px h-5 bg-gray-700/70 light:bg-gray-200 mx-1" />

  return (
    <div className="flex items-center gap-1.5 px-3 bg-gray-900 light:bg-white border-b border-gray-700/60 light:border-gray-200 h-[52px] shrink-0 shadow-sm">
      {/* Brand */}
      <span className="flex items-center gap-2 mr-1 select-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_1px] shadow-cyan-400/60" />
        <span className="text-white light:text-gray-900 font-bold text-sm tracking-tight">HomeDesigner</span>
      </span>
      {divider}

      {/* 2D / 3D toggle */}
      <div className={seg}>
        {(['2d', '3d'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} className={segBtn(viewMode === mode) + ' uppercase'}>{mode}</button>
        ))}
      </div>

      {/* 2D drawing tools */}
      {viewMode === '2d' && (
        <>
          {divider}
          <div className={seg}>
            <button onClick={() => setActiveTool('select')} title="Select (V)" className={segBtn(activeTool === 'select')}>↖ Select</button>
            <button onClick={() => setActiveTool('wall')} title="Draw Wall (W)" className={segBtn(activeTool === 'wall')}>▭ Wall</button>
          </div>
          <button onClick={toggleSnap} title="Toggle grid snap (aligns to the 5 cm grid)"
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
              snapEnabled
                ? 'text-emerald-400 light:text-emerald-600 bg-emerald-500/10'
                : 'text-gray-500 hover:text-gray-300 light:hover:text-gray-700 hover:bg-gray-800 light:hover:bg-gray-100'
            }`}
          >⊞ Snap</button>
        </>
      )}

      {divider}

      {/* Floor switcher */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Floor</span>
        <select
          value={activeFloorId}
          onChange={e => setActiveFloor(e.target.value)}
          className="bg-gray-800 light:bg-gray-100 text-gray-200 light:text-gray-800 text-xs px-2 py-1 rounded-lg border border-gray-700/50 light:border-gray-200 max-w-32 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          {design.floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <button onClick={addFloor} title="Add floor" className={ghost + ' px-2'}>+</button>
        <button
          onClick={() => { if (design.floors.length > 1 && confirm(`Delete "${floor.name}"?`)) deleteFloor(activeFloorId) }}
          disabled={design.floors.length <= 1}
          title="Delete floor"
          className={ghost + ' px-2 hover:!text-red-400'}
        >🗑</button>
      </div>

      {divider}

      {/* Undo / Redo */}
      <div className="flex items-center">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className={ghost}>↩</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className={ghost}>↪</button>
      </div>

      <div className="flex-1" />

      {/* Autosave indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mr-1 select-none" title="Auto-saved to your browser">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50" />
        {savedLabel}
        <span className="text-gray-600 light:text-gray-400 font-mono ml-1.5 tabular-nums">
          {floor.walls.length}w·{floor.furniture.length}f{rooms.length > 0 && `·${rooms.length}r`}
        </span>
      </div>

      {divider}

      {/* File ops */}
      <div className="flex items-center gap-0.5">
        <button onClick={openTemplatePicker} title="Browse templates" className={ghost + ' hover:!text-cyan-300'}>⊞ Templates</button>
        <button onClick={handleSaveAsTemplate} title="Save current design as a template" className={ghost + ' hover:!text-cyan-300'}>⭐ Save</button>
        <button onClick={handleExport} title="Export design as JSON" className={ghost}>↓ Export</button>
        <button onClick={handleImport} title="Import a design JSON" className={ghost}>↑ Import</button>
        <button onClick={openWelcome} title="New design" className={ghost + ' hover:!text-red-400'}>New</button>
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className={ghost + ' px-2'}>{theme === 'dark' ? '☀' : '🌙'}</button>
      </div>
    </div>
  )
}

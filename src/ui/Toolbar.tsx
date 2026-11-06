import { useEffect, useMemo, useRef, useState } from 'react'
import { useDesignStore, useTemporalStore, useActiveFloor } from '../store/design'
import { exportJSON, importJSON } from '../persistence/storage'
import { deriveRooms } from '../geometry/rooms'
import { saveUserTemplate } from '../persistence/templates'
import { planToSVG, downloadSVG, downloadPNG, printSVG } from '../persistence/planExport'
import { shareUrl } from '../persistence/share'

export function Toolbar() {
  const {
    viewMode, setViewMode, activeTool, setActiveTool, loadDesign, design,
    snapEnabled, toggleSnap, undo, redo,
    activeFloorId, setActiveFloor, addFloor, deleteFloor,
    openWelcome, openTemplatePicker,
    theme, toggleTheme, lastSavedAt, units, setUnits, showToast,
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

  const handleImport = async () => {
    const d = await importJSON()
    if (d) { loadDesign(d); showToast('Design imported') }
  }
  const handleSaveAsTemplate = () => {
    const name = prompt('Save current design as a template — name:')
    if (!name || !name.trim()) return
    saveUserTemplate(name.trim(), design)
    showToast(`Saved "${name.trim()}" to My Templates`)
  }
  const handleShare = async () => {
    try {
      const url = await shareUrl(design)
      try {
        await navigator.clipboard.writeText(url)
        showToast(url.length > 8000 ? 'Link copied — it’s long, some chat apps may truncate it' : 'Share link copied to clipboard')
      } catch {
        prompt('Copy this link to share your design:', url)
      }
    } catch {
      showToast('Couldn’t create a share link in this browser')
    }
  }

  /** Export the active floor as a plan image, print it, or download the design file. */
  const handleExport = (kind: 'png' | 'svg' | 'print' | 'json') => {
    if (kind === 'json') return exportJSON(design)
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    const svg = planToSVG(floor, { units, title: floor.name || 'Floor plan', date })
    const file = `homedesigner-${(floor.name || 'plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    if (kind === 'svg') downloadSVG(svg, `${file}.svg`)
    else if (kind === 'print') printSVG(svg, floor.name || 'Floor plan')
    else downloadPNG(svg, `${file}.png`).catch(() => showToast('PNG export failed — try SVG instead'))
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const ctrl = e.ctrlKey || e.metaKey
      // With Shift held the key arrives as 'Z', so compare case-insensitively.
      const key = e.key.toLowerCase()
      if (ctrl && key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
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
        <button onClick={addFloor} title="Add floor" aria-label="Add floor" className={ghost + ' px-2'}>+</button>
        <button
          onClick={() => { if (design.floors.length > 1 && confirm(`Delete "${floor.name}"?`)) deleteFloor(activeFloorId) }}
          disabled={design.floors.length <= 1}
          title="Delete floor" aria-label="Delete floor"
          className={ghost + ' px-2 hover:!text-red-400'}
        >🗑</button>
      </div>

      {divider}

      {/* Undo / Redo */}
      <div className="flex items-center">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo" className={ghost}>↩</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo" className={ghost}>↪</button>
      </div>

      <div className="flex-1" />

      {/* Autosave indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mr-1 select-none" title="Auto-saved to your browser">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/50" />
        {savedLabel}
        <span className="hidden 2xl:inline text-gray-600 light:text-gray-400 font-mono ml-1.5 tabular-nums">
          {floor.walls.length}w·{floor.furniture.length}f{rooms.length > 0 && `·${rooms.length}r`}
        </span>
      </div>

      {/* Units */}
      <div className={seg} title="Display units — type any unit into a field (2.5m, 8' 2&quot;, 96in)">
        {([['cm', 'cm'], ['m', 'm'], ['ftin', 'ft']] as const).map(([u, label]) => (
          <button key={u} onClick={() => setUnits(u)} className={segBtn(units === u, '!px-2')}>{label}</button>
        ))}
      </div>

      {divider}

      {/* File ops */}
      <div className="flex items-center gap-0.5">
        <button onClick={openTemplatePicker} title="Browse templates" aria-label="Templates" className={ghost + ' hover:!text-cyan-300'}>⊞<span className="hidden min-[1400px]:inline"> Templates</span></button>
        <button onClick={handleSaveAsTemplate} title="Save current design as a template" aria-label="Save as template" className={ghost + ' hover:!text-cyan-300'}>⭐<span className="hidden 2xl:inline"> Save</span></button>
        <button onClick={handleShare} title="Copy a link that opens this design" aria-label="Share" className={ghost + ' hover:!text-cyan-300'}>🔗<span className="hidden min-[1400px]:inline"> Share</span></button>
        <ExportMenu buttonClass={ghost} onPick={handleExport} />
        <button onClick={handleImport} title="Import a design JSON" aria-label="Import" className={ghost}>↑<span className="hidden 2xl:inline"> Import</span></button>
        <button onClick={openWelcome} title="New design" className={ghost + ' hover:!text-red-400'}>New</button>
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className={ghost + ' px-2'}>{theme === 'dark' ? '☀' : '🌙'}</button>
      </div>
    </div>
  )
}

const EXPORT_ITEMS = [
  { kind: 'png', label: 'Floor plan (PNG)', hint: 'High-res image with dimensions' },
  { kind: 'svg', label: 'Floor plan (SVG)', hint: 'Scalable vector for print or CAD' },
  { kind: 'print', label: 'Print / Save as PDF…', hint: 'Opens the print dialog' },
  { kind: 'json', label: 'Design file (.json)', hint: 'Re-import later with ↑ Import' },
] as const

/** "↓ Export ▾" dropdown. Closes on pick, outside click or Escape. */
function ExportMenu({ buttonClass, onPick }: {
  buttonClass: string
  onPick: (kind: (typeof EXPORT_ITEMS)[number]['kind']) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', close) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} title="Export the plan or the design file" aria-label="Export" className={buttonClass}>
        ↓<span className="hidden min-[1400px]:inline"> Export</span> <span className="text-[9px] opacity-70">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-gray-700 light:border-gray-200 bg-gray-900 light:bg-white shadow-xl shadow-black/40 p-1">
          {EXPORT_ITEMS.map(item => (
            <button
              key={item.kind}
              role="menuitem"
              onClick={() => { setOpen(false); onPick(item.kind) }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 light:hover:bg-gray-100 transition-colors"
            >
              <div className="text-xs font-semibold text-gray-200 light:text-gray-800">{item.label}</div>
              <div className="text-[10px] text-gray-500">{item.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

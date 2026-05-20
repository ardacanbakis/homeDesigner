import { useState, useCallback } from 'react'
import { useDesignStore } from '../store/design'
import { createTemplate } from '../persistence/template'

const BASE = import.meta.env.BASE_URL

// ── Theme ──────────────────────────────────────────────────────────────────────
type Theme = 'dark' | 'light'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('hd-theme') as Theme) ?? 'dark'
  )
  const toggle = useCallback(() =>
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('hd-theme', next)
      return next
    }), [])
  return { theme, toggle }
}

// ── Neon Grid (THEO letters) ───────────────────────────────────────────────────
const GRID_COLS = 30
const GRID_ROWS = 8

const ACTIVE_CELLS = new Set<string>([
  // T  (cols 2-6, rows 1-5)
  '2,1','3,1','4,1','5,1','6,1',
  '4,2','4,3','4,4','4,5',
  // H  (cols 9-13, rows 1-5)
  '9,1','13,1','9,2','13,2',
  '9,3','10,3','11,3','12,3','13,3',
  '9,4','13,4','9,5','13,5',
  // E  (cols 16-20, rows 1-5)
  '16,1','17,1','18,1','19,1','20,1',
  '16,2',
  '16,3','17,3','18,3','19,3',
  '16,4',
  '16,5','17,5','18,5','19,5','20,5',
  // O  (cols 23-27, rows 1-5)
  '24,1','25,1','26,1',
  '23,2','27,2','23,3','27,3','23,4','27,4',
  '24,5','25,5','26,5',
])

function NeonGrid({ theme }: { theme: Theme }) {
  const isDark = theme === 'dark'
  const cells = []
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const key = `${c},${r}`
      const isActive = ACTIVE_CELLS.has(key)
      const delay = `${((c * 0.15 + r * 0.35) % 2.5).toFixed(2)}s`
      cells.push(
        <div
          key={key}
          className={isActive ? (isDark ? 'neon-cell-active rounded-sm' : 'neon-cell-active-light rounded-sm') : 'rounded-sm'}
          style={{
            background: isActive
              ? (isDark ? '#a855f7' : '#7c3aed')
              : (isDark ? 'rgba(168,85,247,0.07)' : 'rgba(124,58,237,0.05)'),
            boxShadow: isActive
              ? (isDark ? '0 0 7px 2px rgba(168,85,247,0.75)' : '0 0 5px 1px rgba(124,58,237,0.45)')
              : 'none',
            animationDelay: isActive ? delay : undefined,
          }}
        />
      )
    }
  }
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gap: '3px',
        padding: '28px',
        opacity: isDark ? 0.7 : 0.5,
      }}
    >
      {cells}
    </div>
  )
}

// ── Content ───────────────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    num: '01',
    icon: '▭',
    title: 'Draw Walls',
    desc: 'Press W to activate the wall tool, click two points to place each segment. Snap-to-grid keeps everything aligned.',
  },
  {
    num: '02',
    icon: '🪑',
    title: 'Add Furniture',
    desc: 'Drag presets from the palette onto the canvas, or click to place at center. Rotate with R and fine-tune in the Inspector.',
  },
  {
    num: '03',
    icon: '🎲',
    title: 'Switch to 3D',
    desc: 'Click the 3D button in the toolbar. Orbit, pan and zoom to walk through your finished space in real time.',
  },
  {
    num: '04',
    icon: '💾',
    title: 'Export & Share',
    desc: 'Designs auto-save to your browser. Export JSON to download and Import to restore on any device.',
  },
]

const FEATURES = [
  { icon: '▭',  title: '2D Floor Plan Editor', desc: 'Precise wall drawing with live snap-to-grid and dimension labels.' },
  { icon: '🎲', title: 'Real-time 3D View',     desc: 'Orbit camera that updates the instant you switch modes.' },
  { icon: '🛋️', title: 'Furniture Catalog',      desc: '15+ preset items across 5 room categories with 3D models.' },
  { icon: '📦', title: 'Custom Objects',         desc: 'Name, size and color any object — shown to scale in 3D.' },
  { icon: '↩',  title: 'Undo / Redo',           desc: 'Full edit history with Ctrl+Z / Ctrl+Y keyboard shortcuts.' },
  { icon: '🏢', title: 'Multi-Floor',            desc: 'Design multi-storey homes with independent floor layouts.' },
]

const SOCIAL = [
  { label: 'GitHub',    href: 'https://github.com/ardacanbakis', sym: 'GH' },
  { label: 'Instagram', href: '#',                               sym: 'IG' },
  { label: 'YouTube',   href: '#',                               sym: 'YT' },
  { label: 'Spotify',   href: '#',                               sym: '♫'  },
  { label: 'LinkedIn',  href: '#',                               sym: 'in' },
  { label: 'Website',   href: '#',                               sym: '🌐' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function cls(dark: boolean, darkCls: string, lightCls: string) {
  return dark ? darkCls : lightCls
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function WelcomeScreen() {
  const { loadDesign, newDesign, closeWelcome } = useDesignStore()
  const { theme, toggle } = useTheme()
  const [step, setStep] = useState(0)
  const isDark = theme === 'dark'

  function handleTemplate() {
    loadDesign(createTemplate())
  }

  function handleBlank() {
    newDesign()
    closeWelcome()
  }

  // ── Theming classes ───────────────────────────────────────────────────────
  const backdropBg = isDark ? 'bg-gray-950/85 backdrop-blur-sm' : 'bg-slate-200/90 backdrop-blur-sm'
  const cardBg     = isDark ? 'bg-gray-900 border-gray-700'     : 'bg-white border-gray-200'
  const headingClr = isDark ? 'text-white'     : 'text-gray-900'
  const subClr     = isDark ? 'text-gray-400'  : 'text-gray-500'
  const bodyClr    = isDark ? 'text-gray-300'  : 'text-gray-600'
  const divClr     = isDark ? 'border-gray-800': 'border-gray-100'
  const stepCardBg = isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
  const stepNumClr = isDark ? 'text-purple-400' : 'text-purple-600'
  const btnSecBg   = isDark
    ? 'bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700'
    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
  const navBtnClr  = isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'
  const socialClr  = isDark
    ? 'text-gray-500 hover:text-purple-400 transition-colors'
    : 'text-gray-400 hover:text-purple-600 transition-colors'
  const toggleBg   = isDark
    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center ${backdropBg}`}>
      {/* Neon background — only on splash */}
      {step === 0 && <NeonGrid theme={theme} />}

      <div className={`relative w-[640px] max-h-[90vh] overflow-hidden border rounded-2xl shadow-2xl flex flex-col ${cardBg}`}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className={`text-xs px-2 py-1 rounded ${navBtnClr}`}>
                ← Back
              </button>
            )}
            {step > 0 && (
              <span className={`text-[10px] font-mono ${subClr}`}>Step {step} of 2</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${toggleBg}`}
            >
              {isDark ? '☀' : '🌙'}
            </button>
            <button
              onClick={closeWelcome}
              className={`text-xs px-2 py-1 rounded ${navBtnClr}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Step 0: Splash ───────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col items-center px-8 py-6 gap-5">
            {/* Logo + title */}
            <div className="flex flex-col items-center gap-2">
              <img
                src={`${BASE}favicon.svg`}
                alt="HomeDesigner logo"
                className="w-14 h-14"
                style={isDark ? undefined : { filter: 'saturate(1.2) brightness(0.85)' }}
              />
              <h1 className={`text-3xl font-bold tracking-tight ${headingClr}`}>HomeDesigner</h1>
              <p className={`text-sm text-center ${subClr}`}>
                Sketch floor plans in 2D · Walk through them in 3D
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 w-full max-w-sm">
              <button
                onClick={handleTemplate}
                className="w-full py-3 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors shadow-lg shadow-purple-900/30"
              >
                🏘️  Explore the Template Home
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleBlank}
                  className={`flex-1 py-2.5 text-xs font-medium border rounded-xl transition-colors ${btnSecBg}`}
                >
                  ✏️  Start from Scratch
                </button>
                <button
                  onClick={() => setStep(1)}
                  className={`flex-1 py-2.5 text-xs font-medium border rounded-xl transition-colors ${btnSecBg}`}
                >
                  📖  How It Works →
                </button>
              </div>
            </div>

            {/* Keyboard shortcuts teaser */}
            <div className={`border-t ${divClr} pt-4 w-full grid grid-cols-3 gap-3 text-center`}>
              {[['W', 'Draw walls'], ['R', 'Rotate item'], ['Ctrl+Z', 'Undo']].map(([key, desc]) => (
                <div key={key} className={`text-[11px] ${subClr}`}>
                  <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mr-1 border ${
                    isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}>{key}</kbd>
                  {desc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: How It Works ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col px-7 py-5 gap-5 overflow-y-auto">
            <div className="text-center">
              <h2 className={`text-xl font-bold ${headingClr}`}>How It Works</h2>
              <p className={`text-xs mt-1 ${subClr}`}>Four steps from blank canvas to finished room</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PROCESS_STEPS.map(s => (
                <div key={s.num} className={`flex flex-col gap-2 p-4 rounded-xl border ${stepCardBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono font-bold ${stepNumClr}`}>{s.num}</span>
                    <span className="text-lg leading-none">{s.icon}</span>
                  </div>
                  <div className={`text-xs font-semibold ${headingClr}`}>{s.title}</div>
                  <div className={`text-[11px] leading-relaxed ${bodyClr}`}>{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
              >
                See Features →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Features ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col px-7 py-5 gap-5 overflow-y-auto">
            <div className="text-center">
              <h2 className={`text-xl font-bold ${headingClr}`}>Features</h2>
              <p className={`text-xs mt-1 ${subClr}`}>Everything you need to design your home</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {FEATURES.map(feat => (
                <div key={feat.title} className={`flex flex-col gap-1.5 p-3.5 rounded-xl border ${stepCardBg}`}>
                  <span className="text-2xl leading-none">{feat.icon}</span>
                  <div className={`text-xs font-semibold leading-tight ${headingClr}`}>{feat.title}</div>
                  <div className={`text-[10px] leading-relaxed ${bodyClr}`}>{feat.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTemplate}
                className="flex-1 py-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
              >
                🏘️  Load Template Home
              </button>
              <button
                onClick={handleBlank}
                className={`flex-1 py-2.5 text-xs font-medium border rounded-xl transition-colors ${btnSecBg}`}
              >
                ✏️  Start from Scratch
              </button>
            </div>
          </div>
        )}

        {/* Social footer */}
        <div className={`shrink-0 border-t ${divClr} px-6 py-3 flex items-center justify-center gap-5`}>
          {SOCIAL.map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              title={s.label}
              className={`text-[11px] font-mono font-semibold tracking-wide ${socialClr}`}
            >
              {s.sym}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

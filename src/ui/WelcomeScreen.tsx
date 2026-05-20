import { useState, useEffect, type CSSProperties } from 'react'
import { useDesignStore } from '../store/design'
import { createTemplate } from '../persistence/template'

const BASE = import.meta.env.BASE_URL
const THEME_KEY = 'hd-welcome-theme'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved !== null) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

// ── Social icons ────────────────────────────────────────────────────────────────
function GithubIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
function YoutubeIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}
function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  )
}
function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}
function SpotifyIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
function LinkedinIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

// ── Content (HomeDesigner) ────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Draw Your Walls',
    desc: 'Press W and click two points to lay down each wall. Snap-to-grid keeps everything aligned, and you can edit exact lengths, heights, and thickness any time.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4h16v16H4z M4 9h16 M9 9v11" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Furnish the Space',
    desc: 'Drag furniture from the palette onto your floor plan, or add custom objects with your own dimensions and color. Rotate with R and fine-tune in the Inspector.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 11V7a2 2 0 012-2h12a2 2 0 012 2v4m-16 0a2 2 0 00-2 2v4h20v-4a2 2 0 00-2-2m-16 0h16M5 19v2M19 19v2" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Explore in 3D',
    desc: 'Switch to 3D and orbit, pan, and zoom through your design. Walls extrude automatically with doors and windows cut in, and furniture appears to scale.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2l9 5v10l-9 5-9-5V7l9-5z M12 2v20 M3 7l9 5 9-5" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Save & Export',
    desc: 'Designs auto-save to your browser. Export to a JSON file to back up or share your home, and import it back on any device — everything stays client-side.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const FEATURES = [
  {
    title: '2D Floor Plan Editor',
    desc: 'Precise wall drawing with live dimensions, snap-to-grid, and editable doors and windows.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4h16v16H4z M4 9h16 M9 9v11" />
      </svg>
    ),
  },
  {
    title: 'Real-Time 3D View',
    desc: 'Orbit, pan, and zoom through your space. Walls, openings, and furniture update instantly.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2l9 5v10l-9 5-9-5V7l9-5z M12 2v20 M3 7l9 5 9-5" />
      </svg>
    ),
  },
  {
    title: 'Furniture & Custom Objects',
    desc: '15+ preset items across 5 room categories, plus custom objects sized to your exact dimensions.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 11V7a2 2 0 012-2h12a2 2 0 012 2v4m-16 0a2 2 0 00-2 2v4h20v-4a2 2 0 00-2-2m-16 0h16" />
      </svg>
    ),
  },
  {
    title: 'Multi-Floor & Undo/Redo',
    desc: 'Design multiple floors with stairs, and undo or redo every change with Ctrl+Z / Ctrl+Y.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21h4v-4h4v-4h4V9h4V5 M3 21V5" />
      </svg>
    ),
  },
]

const SOCIAL_LINKS = [
  { href: 'https://ardacanbakis.com', icon: <GlobeIcon />, label: 'Website' },
  { href: 'https://github.com/ardacanbakis', icon: <GithubIcon />, label: 'GitHub' },
  { href: 'https://www.instagram.com/arda.canbakiss/', icon: <InstagramIcon />, label: 'Instagram' },
  { href: 'https://www.youtube.com/@arda.canbakis', icon: <YoutubeIcon />, label: 'YouTube' },
  { href: 'https://open.spotify.com/user/11146430303', icon: <SpotifyIcon />, label: 'Spotify' },
  { href: 'http://linkedin.com/in/ardacanbakis', icon: <LinkedinIcon />, label: 'LinkedIn' },
]

function Footer({ dark }: { dark: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-3">
        {SOCIAL_LINKS.map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className={`p-2 rounded-full transition-colors ${
              dark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            {link.icon}
          </a>
        ))}
      </div>
      <p className={`text-center text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
        Created with{' '}
        <svg className="inline w-3 h-3 -mt-0.5" viewBox="0 0 24 24" fill="#ef4444">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>{' '}
        by{' '}
        <a
          href="https://ardacanbakis.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors ${dark ? 'text-gray-500 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
        >
          Arda Canbakis
        </a>{' '}
        © 2026
      </p>
    </div>
  )
}

const WELCOME_KEYFRAMES = `@keyframes welcome-grid-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes welcome-cell-pulse { 0%, 100% { opacity: 0.15; transform: scale(0.9); filter: blur(0.5px); } 50% { opacity: 0.95; transform: scale(1); filter: blur(0px); } }
@keyframes welcome-logo-in { 0% { opacity: 0; transform: scale(2.2); filter: blur(8px); } 60% { opacity: 1; filter: blur(0px); } 100% { opacity: 1; transform: scale(1); filter: blur(0px); } }
@keyframes welcome-slogan-glow { 0%, 100% { text-shadow: 0 0 6px var(--neon), 0 0 14px var(--neon-soft); } 50% { text-shadow: 0 0 14px var(--neon), 0 0 28px var(--neon-soft); } }
@keyframes welcome-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bounce-tl { 0% { opacity:0; transform: translate(-120%, -120%) scale(0.4); } 65% { opacity:1; transform: translate(4%, 4%) scale(1.05); } 82% { transform: translate(-2%, -2%) scale(0.97); } 100% { opacity:1; transform: translate(0,0) scale(1); } }
@keyframes bounce-tr { 0% { opacity:0; transform: translate(120%, -120%) scale(0.4); } 65% { opacity:1; transform: translate(-4%, 4%) scale(1.05); } 82% { transform: translate(2%, -2%) scale(0.97); } 100% { opacity:1; transform: translate(0,0) scale(1); } }
@keyframes bounce-bl { 0% { opacity:0; transform: translate(-120%, 120%) scale(0.4); } 65% { opacity:1; transform: translate(4%, -4%) scale(1.05); } 82% { transform: translate(-2%, 2%) scale(0.97); } 100% { opacity:1; transform: translate(0,0) scale(1); } }
@keyframes bounce-br { 0% { opacity:0; transform: translate(120%, 120%) scale(0.4); } 65% { opacity:1; transform: translate(-4%, -4%) scale(1.05); } 82% { transform: translate(2%, 2%) scale(0.97); } 100% { opacity:1; transform: translate(0,0) scale(1); } }`

// THEO spelled across a 16×14 grid — T top-left, H top-right, E bottom-left, O bottom-right
const ACTIVE_CELLS: Array<[number, number]> = [
  // T — top-left
  [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
  [3, 2], [3, 3], [3, 4], [3, 5],
  // H — top-right
  [10, 1], [14, 1], [10, 2], [14, 2],
  [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
  [10, 4], [14, 4], [10, 5], [14, 5],
  // E — bottom-left
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [1, 9],
  [1, 10], [2, 10], [3, 10], [4, 10],
  [1, 11],
  [1, 12], [2, 12], [3, 12], [4, 12], [5, 12],
  // O — bottom-right
  [11, 8], [12, 8], [13, 8],
  [10, 9], [14, 9],
  [10, 10], [14, 10],
  [10, 11], [14, 11],
  [11, 12], [12, 12], [13, 12],
]

function NeonGrid({ dark }: { dark: boolean }) {
  const accent = dark ? '#22d3ee' : '#3b82f6'
  const accentSoft = dark ? 'rgba(34,211,238,0.5)' : 'rgba(59,130,246,0.45)'
  const lineColor = dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(71, 85, 105, 0.10)'
  const cols = 16
  const rows = 14

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
          backgroundSize: '6vmin 6vmin',
          animation: 'welcome-grid-fade 1.5s ease-out both',
        }}
      />
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {ACTIVE_CELLS.map(([c, r], i) => {
          const delay = (i % 7) * 0.18 + (r % 3) * 0.12
          const baseDur = 2.2 + ((i * 13) % 9) / 10
          const dur = dark ? baseDur : baseDur * 1.6
          return (
            <div
              key={`${c}-${r}`}
              style={{
                gridColumn: c + 1,
                gridRow: r + 1,
                margin: '12%',
                background: accent,
                borderRadius: '2px',
                boxShadow: `0 0 12px ${accent}, 0 0 24px ${accentSoft}`,
                opacity: 0,
                animation: `welcome-cell-pulse ${dur}s ease-in-out ${0.4 + delay}s infinite`,
              }}
            />
          )
        })}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'radial-gradient(circle at 50% 55%, transparent 0%, rgba(10,15,25,0.55) 70%, rgba(10,15,25,0.85) 100%)'
            : 'radial-gradient(circle at 50% 55%, transparent 0%, rgba(248,250,252,0.6) 70%, rgba(248,250,252,0.9) 100%)',
        }}
      />
    </div>
  )
}

export function WelcomeScreen() {
  const { loadDesign, newDesign, closeWelcome } = useDesignStore()
  const [step, setStep] = useState(0)
  const { dark, toggle: toggleTheme } = useTheme()

  function startTemplate() {
    loadDesign(createTemplate())
  }
  function startBlank() {
    newDesign()
    closeWelcome()
  }

  const bg = dark ? 'bg-[#0a0f19]' : 'bg-slate-50'
  const text = dark ? 'text-white' : 'text-gray-900'
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
  const textFaint = dark ? 'text-gray-400' : 'text-gray-500'
  const iconColor = dark ? 'text-cyan-400' : 'text-blue-600'
  const skipColor = dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-700'
  const themeBtnColor = dark ? 'text-gray-400 hover:text-yellow-300 hover:bg-white/10' : 'text-gray-500 hover:text-orange-600 hover:bg-black/5'
  const neon = dark ? '#22d3ee' : '#3b82f6'
  const neonSoft = dark ? 'rgba(34,211,238,0.55)' : 'rgba(59,130,246,0.45)'
  const gradient = dark
    ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'

  const cssVars = { '--neon': neon, '--neon-soft': neonSoft } as CSSProperties

  const secondaryBtn = dark
    ? 'border border-gray-600 text-gray-200 hover:bg-white/5'
    : 'border border-gray-300 text-gray-700 hover:bg-black/5'

  return (
    <div
      className={`fixed inset-0 z-50 ${bg} flex flex-col items-center justify-center p-4 transition-colors duration-500 overflow-hidden`}
      style={cssVars}
    >
      <style>{WELCOME_KEYFRAMES}</style>

      <NeonGrid dark={dark} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-colors ${themeBtnColor}`}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="relative z-10 max-w-lg w-full flex-1 flex items-center justify-center">
        {step === 0 && (
          <div className="text-center space-y-6">
            <div
              className="flex flex-col items-center justify-center gap-3"
              style={{ animation: 'welcome-logo-in 1.4s cubic-bezier(0.22, 1, 0.36, 1) both' }}
            >
              <img
                src={`${BASE}favicon.svg`}
                alt="HomeDesigner"
                className="h-24 w-auto object-contain"
                style={dark ? undefined : { filter: 'saturate(1.15) brightness(0.9)' }}
              />
              <h1 className={`text-3xl font-bold tracking-tight ${text}`}>HomeDesigner</h1>
            </div>
            <p
              className={`${textMuted} text-lg font-medium tracking-wide`}
              style={{
                color: neon,
                animation: 'welcome-fade-up 0.7s ease-out 1.6s both, welcome-slogan-glow 3.2s ease-in-out 2.3s infinite',
              }}
            >
              Sketch floor plans in 2D · Walk through them in 3D
            </p>
            <p
              className={`${textFaint} text-sm max-w-sm mx-auto`}
              style={{ animation: 'welcome-fade-up 0.7s ease-out 1.9s both' }}
            >
              Draw walls, drop in furniture, and explore your home in real-time 3D — all in your
              browser, with nothing to install.
            </p>
            <button
              onClick={() => setStep(1)}
              className="mt-4 font-medium py-3 px-8 rounded-lg transition-all text-base text-white"
              style={{
                background: gradient,
                boxShadow: `0 0 24px ${neonSoft}`,
                animation: 'welcome-fade-up 0.7s ease-out 2.2s both',
              }}
            >
              How It Works
            </button>
            <div style={{ animation: 'welcome-fade-up 0.7s ease-out 2.4s both' }}>
              <button onClick={startBlank} className={`${skipColor} text-sm transition-colors`}>
                Skip intro
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="text-center space-y-5 w-full max-w-lg">
            <div style={{ animation: 'welcome-fade-up 0.5s ease-out both' }}>
              <h2 className={`text-xl font-semibold ${text}`}>The Process</h2>
              <p className={`text-sm ${textFaint} mt-1`}>Four steps from empty room to finished home</p>
            </div>

            <div className="space-y-3 mt-4">
              {PROCESS_STEPS.map((s, i) => {
                const dur = dark ? '0.55s' : '0.85s'
                const delay = dark ? `${0.15 + i * 0.22}s` : `${0.2 + i * 0.35}s`
                const cardBg = dark
                  ? 'bg-gray-900/70 border-gray-700/60 backdrop-blur-sm'
                  : 'bg-white/80 border-gray-200 shadow-sm backdrop-blur-sm'
                return (
                  <div
                    key={i}
                    className={`${cardBg} border rounded-lg p-4 flex items-start gap-4 text-left`}
                    style={{ opacity: 0, animation: `welcome-fade-up ${dur} ease-out ${delay} both` }}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: gradient, boxShadow: `0 0 12px ${neonSoft}` }}
                    >
                      <span className="text-white">{s.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold tracking-widest" style={{ color: neon }}>{s.number}</span>
                        <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{s.title}</h3>
                      </div>
                      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'} mt-1 leading-relaxed`}>{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="flex items-center justify-center gap-4 pt-2"
              style={{ opacity: 0, animation: `welcome-fade-up 0.6s ease-out ${dark ? '1.2s' : '1.8s'} both` }}
            >
              <button
                onClick={() => setStep(2)}
                className="font-medium py-3 px-8 rounded-lg transition-all text-base text-white"
                style={{ background: gradient, boxShadow: `0 0 24px ${neonSoft}` }}
              >
                See All Features
              </button>
              <button onClick={startBlank} className={`${skipColor} text-sm transition-colors`}>
                Skip
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-6">
            <div style={{ animation: 'welcome-fade-up 0.5s ease-out both' }}>
              <h2 className={`text-xl font-semibold ${text}`}>What You Can Build</h2>
              <p className={`text-sm ${textFaint} mt-1`}>A full 2D + 3D home design suite in your browser</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {FEATURES.map((f, i) => {
                const bounceAnim = ['bounce-tl', 'bounce-tr', 'bounce-bl', 'bounce-br'][i]
                const dur = dark ? '0.55s' : '0.9s'
                const delay = dark ? `${0.2 + i * 0.35}s` : `${0.3 + i * 0.55}s`
                const cardBg = dark
                  ? 'bg-gray-900/70 border-gray-700/60 backdrop-blur-sm'
                  : 'bg-white/80 border-gray-200 shadow-sm backdrop-blur-sm'
                return (
                  <div
                    key={i}
                    className={`${cardBg} border rounded-lg p-4 flex gap-3`}
                    style={{ opacity: 0, animation: `${bounceAnim} ${dur} cubic-bezier(0.22, 1, 0.36, 1) ${delay} both` }}
                  >
                    <div className={`${iconColor} shrink-0 mt-0.5`}>{f.icon}</div>
                    <div className="text-left">
                      <h3 className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-600'} mt-1 leading-relaxed`}>{f.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2"
              style={{ opacity: 0, animation: `welcome-fade-up 0.6s ease-out ${dark ? '1.8s' : '2.8s'} both` }}
            >
              <button
                onClick={startTemplate}
                className="font-medium py-3 px-8 rounded-lg transition-all text-base text-white"
                style={{ background: gradient, boxShadow: `0 0 24px ${neonSoft}` }}
              >
                Start with Template Home
              </button>
              <button
                onClick={startBlank}
                className={`font-medium py-3 px-8 rounded-lg transition-all text-base ${secondaryBtn}`}
              >
                Start Brand New
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer — pinned to bottom */}
      <div className="relative z-10 shrink-0 pb-4">
        <Footer dark={dark} />
      </div>
    </div>
  )
}

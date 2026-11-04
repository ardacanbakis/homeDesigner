import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import { useDesignStore, REOPEN_3D_KEY } from './store/design'
import { Toolbar } from './ui/Toolbar'
import { Palette } from './ui/Palette'
import { Inspector } from './ui/Inspector'
import { Canvas2D } from './editor2d/Canvas2D'
import { WelcomeScreen } from './ui/WelcomeScreen'
import { TemplatePicker } from './ui/TemplatePicker'
import { Toast, SharedDesignGate } from './ui/Overlays'
import { ErrorBoundary } from './ui/ErrorBoundary'

/** Live pixel size of an element — the canvas must match its container exactly,
 *  and hard-coded panel widths drift whenever the side panels change. */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

// The 3D view (three.js + react-three-fiber, ~1.2 MB) is split out of the main
// bundle so the editor opens fast; it's fetched in the background once the
// page is idle, so switching to 3D is still instant. A failed fetch isn't
// cached, so "Try again" really retries.
let scenePromise: Promise<{ default: ComponentType }> | null = null
function loadScene() {
  scenePromise ??= import('./scene3d/Scene3D')
    .then(m => ({ default: m.Scene3D }))
    .catch(err => { scenePromise = null; throw err })
  return scenePromise
}

function ViewLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-2.5 text-xs text-gray-400 light:text-gray-500">
        <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        Loading 3D view…
      </div>
    </div>
  )
}

/** Browsers cache a failed dynamic import for the life of the page, so the
 *  only real retry is a reload (the design is autosaved). Check the server is
 *  reachable first, so a retry while offline doesn't blank the tab. */
async function reloadInto3D(showToast: (m: string) => void) {
  try {
    const res = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
  } catch {
    showToast('Still can’t reach the server — check your connection')
    return
  }
  try { sessionStorage.setItem(REOPEN_3D_KEY, '1') } catch { /* ignore */ }
  window.location.reload()
}

const isChunkError = (e: Error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(e.message)

function View3D() {
  const [Scene, setScene] = useState(() => lazy(loadScene))
  const showToast = useDesignStore(s => s.showToast)
  return (
    <ErrorBoundary fallback={(error, retry) => (
      <ViewError error={error} onRetry={() => {
        if (isChunkError(error)) { void reloadInto3D(showToast); return }
        setScene(() => lazy(loadScene))
        retry()
      }} />
    )}>
      <Suspense fallback={<ViewLoading />}>
        <Scene />
      </Suspense>
    </ErrorBoundary>
  )
}

/** Shown in place of the 3D view if it fails (no WebGL, a broken asset…); the
 *  rest of the editor keeps working. */
function ViewError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const setViewMode = useDesignStore(s => s.setViewMode)
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-sm text-center rounded-2xl border border-gray-700 light:border-gray-200 bg-gray-900 light:bg-white p-6 shadow-xl">
        <div className="text-3xl mb-2">🧊</div>
        <h2 className="text-sm font-bold text-white light:text-gray-900">The 3D view couldn’t load</h2>
        <p className="mt-1.5 text-xs text-gray-400 break-words">
          {isChunkError(error) ? 'Couldn’t download the 3D engine. Check your connection, then try again.' : error.message || 'Unknown error'}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setViewMode('2d')} className="px-3 py-1.5 text-xs rounded-lg text-gray-300 light:text-gray-700 hover:bg-gray-800 light:hover:bg-gray-100">Back to 2D</button>
          <button onClick={onRetry} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white">Try again</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { viewMode, showWelcome, showTemplatePicker, theme } = useDesignStore()
  const [workspaceRef, { width: workspaceW, height: workspaceH }] = useElementSize<HTMLDivElement>()

  // Warm the 3D chunk once the editor has settled.
  useEffect(() => {
    const warm = () => { loadScene().catch(() => { /* retried on demand */ }) }
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 5000 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(warm, 2000)
    return () => clearTimeout(t)
  }, [])

  // Reflect the theme on <html> so CSS + the light: Tailwind variant can target it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 light:bg-slate-100">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Palette />
        <div ref={workspaceRef} className="flex-1 relative overflow-hidden">
          {viewMode === '2d' ? (
            // Konva can't draw a 0×0 stage; wait for the first measurement.
            workspaceW > 0 && workspaceH > 0 && <Canvas2D width={workspaceW} height={workspaceH} />
          ) : (
            <View3D />
          )}
        </div>
        <Inspector />
        {showWelcome && <WelcomeScreen />}
        {showTemplatePicker && !showWelcome && <TemplatePicker />}
        <SharedDesignGate />
        <Toast />
      </div>
    </div>
  )
}

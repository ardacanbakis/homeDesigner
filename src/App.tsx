import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from './store/design'
import { Toolbar } from './ui/Toolbar'
import { Palette } from './ui/Palette'
import { Inspector } from './ui/Inspector'
import { Canvas2D } from './editor2d/Canvas2D'
import { Scene3D } from './scene3d/Scene3D'
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

/** Shown in place of the 3D view if it fails (no WebGL, a broken asset…); the
 *  rest of the editor keeps working. */
function ViewError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const setViewMode = useDesignStore(s => s.setViewMode)
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="max-w-sm text-center rounded-2xl border border-gray-700 light:border-gray-200 bg-gray-900 light:bg-white p-6 shadow-xl">
        <div className="text-3xl mb-2">🧊</div>
        <h2 className="text-sm font-bold text-white light:text-gray-900">The 3D view couldn’t load</h2>
        <p className="mt-1.5 text-xs text-gray-400 break-words">{error.message || 'Unknown error'}</p>
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
            <ErrorBoundary fallback={(error, retry) => <ViewError error={error} onRetry={retry} />}>
              <Scene3D />
            </ErrorBoundary>
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

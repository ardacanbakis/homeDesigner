import { useEffect, useState } from 'react'
import { useDesignStore } from '../store/design'
import { decodeDesign, readShareHash, clearShareHash } from '../persistence/share'
import { exportJSON } from '../persistence/storage'
import type { Design } from '../store/types'

/** Bottom-centre confirmation pill driven by the store's showToast(). */
export function Toast() {
  const toast = useDesignStore(s => s.toast)
  if (!toast) return null
  return (
    <div
      key={toast.id}
      role="status"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full text-sm font-medium bg-gray-900/95 light:bg-white text-gray-100 light:text-gray-800 border border-cyan-500/40 shadow-lg shadow-black/30 pointer-events-none"
    >
      {toast.message}
    </div>
  )
}

function isBlank(d: Design) {
  return d.floors.every(f => f.walls.length === 0 && f.furniture.length === 0)
}

/** Opens designs shared via a link (#d=…). If the user already has work, asks
 *  before replacing it instead of silently overwriting their autosave. */
export function SharedDesignGate() {
  const { design, loadDesign, showToast } = useDesignStore()
  const [pending, setPending] = useState<Design | null>(null)

  useEffect(() => {
    const handle = () => {
      const payload = readShareHash()
      if (!payload) return
      clearShareHash()
      decodeDesign(payload).then(shared => {
        if (!shared) { showToast('That share link is damaged or incomplete.'); return }
        if (isBlank(useDesignStore.getState().design)) {
          loadDesign(shared)
          showToast('Opened shared design')
        } else {
          setPending(shared)
        }
      })
    }
    handle()
    window.addEventListener('hashchange', handle)
    return () => window.removeEventListener('hashchange', handle)
  }, [loadDesign, showToast])

  if (!pending) return null
  const pieces = pending.floors.reduce((n, f) => n + f.furniture.length, 0)

  return (
    <div className="absolute inset-0 z-[55] flex items-center justify-center bg-gray-950/70 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="shared-title"
        className="w-full max-w-md rounded-2xl border border-gray-700 light:border-gray-200 bg-gray-900 light:bg-white shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1 h-4 rounded-sm bg-cyan-400" />
          <h2 id="shared-title" className="text-base font-bold text-white light:text-gray-900">Open shared design?</h2>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">
          Someone shared a design with {pending.floors.length} floor{pending.floors.length === 1 ? '' : 's'} and {pieces} piece{pieces === 1 ? '' : 's'} of furniture.
          Opening it replaces what's in your editor now.
        </p>
        <button
          onClick={() => exportJSON(design)}
          className="mt-3 text-xs text-cyan-300 light:text-cyan-700 hover:underline"
        >
          ↓ Download my current design first
        </button>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setPending(null)}
            className="px-3.5 py-2 text-sm rounded-lg text-gray-300 light:text-gray-700 hover:bg-gray-800 light:hover:bg-gray-100"
          >
            Keep mine
          </button>
          <button
            onClick={() => { loadDesign(pending); setPending(null); showToast('Opened shared design') }}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white shadow-sm shadow-cyan-500/30"
          >
            Open shared design
          </button>
        </div>
      </div>
    </div>
  )
}

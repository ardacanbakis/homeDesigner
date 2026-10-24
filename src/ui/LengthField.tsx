import { useRef, useState } from 'react'
import { useDesignStore } from '../store/design'
import { formatLength, parseLength } from '../geometry/measure'

/** Text input for a length stored in cm. Shows the value in the current units
 *  and accepts any unit the user types ("2.5m", `8' 2"`, "96in", "250cm").
 *  Commits on Enter/blur; Esc cancels. */
export function LengthField({ value, onChange, min = 1, max = 100000, className = '', title }: {
  value: number
  onChange: (cm: number) => void
  min?: number
  max?: number
  className?: string
  title?: string
}) {
  const units = useDesignStore(s => s.units)
  const [draft, setDraft] = useState<string | null>(null)
  const cancelled = useRef(false)

  const commit = () => {
    if (draft !== null && !cancelled.current) {
      const cm = parseLength(draft, units)
      if (cm !== null) onChange(Math.min(max, Math.max(min, cm)))
    }
    cancelled.current = false
    setDraft(null)
  }

  const hint = units === 'ftin'
    ? `e.g. 8' 2", 96 (inches), 2.5m`
    : units === 'm' ? 'e.g. 2.5 (m), 250cm, 8\' 2"' : 'e.g. 250 (cm), 2.5m, 8\' 2"'

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? formatLength(value, units)}
      title={title ?? hint}
      onFocus={e => { setDraft(formatLength(value, units)); e.currentTarget.select() }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
      }}
      className={`bg-gray-800 text-gray-200 text-xs px-1.5 py-0.5 rounded border border-gray-600 font-mono focus:outline-none focus:border-cyan-500 ${className}`}
    />
  )
}

import { useState } from 'react'
import {
  TEMPLATES, TEMPLATE_CATEGORIES,
  loadUserTemplates, deleteUserTemplate, type UserTemplate,
} from '../persistence/templates'
import type { Design, Units } from '../store/types'
import { useDesignStore } from '../store/design'
import { formatLength, formatArea } from '../geometry/measure'

/** Min/max bounds (cm) of a design's first-floor walls. */
function bounds(design: Design) {
  const walls = design.floors[0]?.walls ?? []
  if (!walls.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const w of walls) {
    minX = Math.min(minX, w.a.x, w.b.x)
    minY = Math.min(minY, w.a.y, w.b.y)
    maxX = Math.max(maxX, w.a.x, w.b.x)
    maxY = Math.max(maxY, w.a.y, w.b.y)
  }
  return { minX, minY, maxX, maxY }
}

/** Footprint summary from the wall bounding box: "5.4 × 4.0 m · 22 m²" or `17' 9" × 13' 1" · 232 ft²`. */
function footprintLabel(design: Design, units: Units): string {
  const b = bounds(design)
  if (!b) return ''
  const w = b.maxX - b.minX, d = b.maxY - b.minY
  if (units === 'ftin') return `${formatLength(w, units)} × ${formatLength(d, units)} · ${formatArea(w * d, units)}`
  return `${(w / 100).toFixed(1)} × ${(d / 100).toFixed(1)} m · ${Math.round((w * d) / 10000)} m²`
}

/** Scaled SVG mini floor-plan: faint furniture footprints + wall lines. */
function FloorPreview({ design, accent, dark }: { design: Design; accent: string; dark: boolean }) {
  const b = bounds(design)
  const floor = design.floors[0]
  if (!b || !floor) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-3xl ${dark ? 'text-gray-700' : 'text-gray-300'}`}>
        ✏️
      </div>
    )
  }
  const pad = 25
  const vb = `${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`

  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      {floor.furniture.map(item => (
        <rect
          key={item.id}
          x={item.position.x}
          y={item.position.y}
          width={item.size.w}
          height={item.size.d}
          rx={4}
          fill={item.color ?? accent}
          opacity={0.5}
        />
      ))}
      {floor.walls.map(w => (
        <line
          key={w.id}
          x1={w.a.x}
          y1={w.a.y}
          x2={w.b.x}
          y2={w.b.y}
          stroke={accent}
          strokeWidth={5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

function TemplateCard({ tpl, design, dark, accent, onPick, onDelete }: {
  tpl: { name: string; description: string; icon: string; rooms: string }
  design: Design
  dark: boolean
  accent: string
  onPick: (d: Design) => void
  /** When present, renders a small delete button on the card (user templates only). */
  onDelete?: () => void
}) {
  const units = useDesignStore(s => s.units)
  const cardBg = dark
    ? 'bg-gray-900/70 border-gray-700/60 hover:border-gray-500'
    : 'bg-white/85 border-gray-200 hover:border-gray-400 shadow-sm'
  const previewBg = dark ? 'bg-[#0d1320]' : 'bg-slate-100'

  return (
    <div className={`group relative text-left rounded-xl border overflow-hidden transition-all hover:-translate-y-0.5 ${cardBg}`}>
      <button
        onClick={() => onPick(design)}
        className="w-full text-left"
      >
        <div className={`h-28 ${previewBg} p-2 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
          <FloorPreview design={design} accent={accent} dark={dark} />
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{tpl.icon}</span>
            <h4 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{tpl.name}</h4>
          </div>
          <p className={`text-[11px] mt-1 leading-snug ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{tpl.description}</p>
          <div className={`mt-2 flex items-center justify-between text-[10px] font-mono ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            <span className="truncate">{tpl.rooms}</span>
            <span className="shrink-0 ml-2" style={{ color: accent }}>{footprintLabel(design, units)}</span>
          </div>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete this saved template"
          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
            dark ? 'bg-gray-800/90 text-gray-400 hover:text-red-400 hover:bg-gray-700'
                 : 'bg-white text-gray-400 hover:text-red-500 hover:bg-gray-100 border border-gray-200'
          }`}
        >🗑</button>
      )}
    </div>
  )
}

export function TemplateGallery({ dark, accent, onPick, onBlank }: {
  dark: boolean
  accent: string
  onPick: (d: Design) => void
  onBlank: () => void
}) {
  // User templates live in localStorage. Bump this counter to re-read after a delete.
  const [userTplsTick, setUserTplsTick] = useState(0)
  const userTpls: UserTemplate[] = (() => {
    void userTplsTick // force re-read when counter changes
    return loadUserTemplates()
  })()

  return (
    <div className="space-y-5">
      {TEMPLATE_CATEGORIES.map(cat => {
        if (cat.id === 'custom') {
          if (userTpls.length === 0) return null
          return (
            <div key={cat.id}>
              <div className={`flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="text-sm">{cat.icon}</span>
                {cat.label}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {userTpls.map(t => {
                  const created = new Date(t.createdAt).toLocaleDateString()
                  return (
                    <TemplateCard
                      key={t.id}
                      tpl={{
                        name: t.name,
                        description: `Saved on ${created}.`,
                        icon: '⭐',
                        rooms: `${t.design.floors.length} floor${t.design.floors.length === 1 ? '' : 's'}`,
                      }}
                      design={t.design}
                      dark={dark}
                      accent={accent}
                      onPick={onPick}
                      onDelete={() => {
                        if (confirm(`Delete saved template "${t.name}"?`)) {
                          deleteUserTemplate(t.id)
                          setUserTplsTick(n => n + 1)
                        }
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        }
        const items = TEMPLATES.filter(t => t.category === cat.id)
        if (!items.length) return null
        return (
          <div key={cat.id}>
            <div className={`flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="text-sm">{cat.icon}</span>
              {cat.label}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  design={tpl.build()}
                  dark={dark}
                  accent={accent}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Start fresh */}
      <div>
        <div className={`flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="text-sm">✏️</span>
          Start fresh
        </div>
        <button
          onClick={onBlank}
          className={`w-full rounded-xl border border-dashed py-4 text-sm font-medium transition-colors ${
            dark
              ? 'border-gray-600 text-gray-300 hover:bg-white/5 hover:border-gray-400'
              : 'border-gray-300 text-gray-600 hover:bg-black/5 hover:border-gray-400'
          }`}
        >
          + Blank Canvas — draw your own from scratch
        </button>
      </div>
    </div>
  )
}

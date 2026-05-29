import { TEMPLATES, TEMPLATE_CATEGORIES, type TemplateMeta } from '../persistence/templates'
import type { Design } from '../store/types'

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

/** "5.0 × 3.6 m · 18 m²" footprint summary from the wall bounding box. */
function footprintLabel(design: Design): string {
  const b = bounds(design)
  if (!b) return ''
  const wM = (b.maxX - b.minX) / 100
  const dM = (b.maxY - b.minY) / 100
  return `${wM.toFixed(1)} × ${dM.toFixed(1)} m · ${Math.round(wM * dM)} m²`
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

function TemplateCard({ tpl, dark, accent, onPick }: {
  tpl: TemplateMeta; dark: boolean; accent: string; onPick: (d: Design) => void
}) {
  const design = tpl.build()
  const cardBg = dark
    ? 'bg-gray-900/70 border-gray-700/60 hover:border-gray-500'
    : 'bg-white/85 border-gray-200 hover:border-gray-400 shadow-sm'
  const previewBg = dark ? 'bg-[#0d1320]' : 'bg-slate-100'

  return (
    <button
      onClick={() => onPick(design)}
      className={`group text-left rounded-xl border overflow-hidden transition-all hover:-translate-y-0.5 ${cardBg}`}
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
          <span className="shrink-0 ml-2" style={{ color: accent }}>{footprintLabel(design)}</span>
        </div>
      </div>
    </button>
  )
}

export function TemplateGallery({ dark, accent, onPick, onBlank }: {
  dark: boolean
  accent: string
  onPick: (d: Design) => void
  onBlank: () => void
}) {
  return (
    <div className="space-y-5">
      {TEMPLATE_CATEGORIES.map(cat => {
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
                <TemplateCard key={tpl.id} tpl={tpl} dark={dark} accent={accent} onPick={onPick} />
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

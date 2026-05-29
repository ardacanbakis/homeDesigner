import { useDesignStore } from '../store/design'
import { TemplateGallery } from './TemplateGallery'

export function TemplatePicker() {
  const { loadDesign, newDesign, closeTemplatePicker } = useDesignStore()

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Choose a Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Loading a template replaces your current design.</p>
          </div>
          <button
            onClick={closeTemplatePicker}
            className="text-gray-500 hover:text-gray-200 text-lg w-8 h-8 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <TemplateGallery
            dark
            accent="#22d3ee"
            onPick={d => loadDesign(d)}
            onBlank={() => { newDesign(); closeTemplatePicker() }}
          />
        </div>
      </div>
    </div>
  )
}

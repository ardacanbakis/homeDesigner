import type { FurnitureKind } from '../store/types'

/** The materials a piece's colour applies to in its 3D model, by glTF material
 *  name (see scripts/generate-models.mjs): the upholstery of a sofa, the
 *  bedding of a bed, the body of a cabinet. Everything else, like handles,
 *  legs and screens, keeps its own finish. */
export const MODEL_TINT: Partial<Record<FurnitureKind, readonly string[]>> = {
  bed: ['mattress'],
  wardrobe: ['wood'],
  dresser: ['wood'],
  nightstand: ['wood', 'top'],
  fridge: ['steel'],
  washer: ['metal'],
  stove: ['metal'],
  sink: ['ceramic'],
  counter: ['cabinet'],
  sofa: ['fabric'],
  table: ['wood'],
  chair: ['seat'],
  tv: ['frame'],
  bookshelf: ['wood'],
  toilet: ['ceramic', 'seat'],
  bathtub: ['tub'],
  shower: ['tile'],
  desk: ['top'],
  lamp: ['shade'],
  plant: ['pot'],
  stairs: ['wood'],
}

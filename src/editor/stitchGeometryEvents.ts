import type { StitchGeometry } from '../types'

export const STITCH_GEOMETRY_EDIT_EVENT = 'crochet-editor:stitch-geometry-edit'

export type StitchGeometryEditDetail = {
  elementId: string
  patch: StitchGeometry
}

export function requestStitchGeometryEdit(detail: StitchGeometryEditDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<StitchGeometryEditDetail>(STITCH_GEOMETRY_EDIT_EVENT, { detail }))
}

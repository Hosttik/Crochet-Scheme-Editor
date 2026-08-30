export const CANVAS_GRID_KEY = 'crochet-scheme-editor-canvas-grid'
export const CANVAS_GRID_CHANGE_EVENT = 'crochet-scheme-editor:canvas-grid-change'

export function storedBooleanPreference(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export function getCanvasGridVisibility() {
  return storedBooleanPreference(CANVAS_GRID_KEY, true)
}

export function setCanvasGridVisibility(visible: boolean) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.canvasGrid = visible ? 'on' : 'off'
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CANVAS_GRID_KEY, String(visible))
    window.dispatchEvent(new CustomEvent<boolean>(CANVAS_GRID_CHANGE_EVENT, { detail: visible }))
  }
}

import type { BackgroundImage, Point } from '../types'

export const DEFAULT_BACKGROUND_OPACITY = 0.45
export const MAX_BACKGROUND_DIMENSION = 1200

export function fittedBackgroundImage(
  dataUrl: string,
  sourceName: string,
  naturalWidth: number,
  naturalHeight: number,
  center: Point,
): BackgroundImage {
  const safeWidth = Math.max(1, Number.isFinite(naturalWidth) ? naturalWidth : 1)
  const safeHeight = Math.max(1, Number.isFinite(naturalHeight) ? naturalHeight : 1)
  const scale = Math.min(1, MAX_BACKGROUND_DIMENSION / Math.max(safeWidth, safeHeight))
  const width = safeWidth * scale
  const height = safeHeight * scale
  return {
    dataUrl,
    sourceName,
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    opacity: DEFAULT_BACKGROUND_OPACITY,
    visible: true,
    locked: false,
    includeInExport: false,
  }
}

export function clampBackgroundOpacity(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BACKGROUND_OPACITY
  return Math.min(1, Math.max(0.05, value))
}

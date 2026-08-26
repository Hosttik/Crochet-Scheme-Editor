import type { BackgroundImage, Point } from '../types'

export const DEFAULT_BACKGROUND_OPACITY = 0.45
export const MAX_BACKGROUND_DIMENSION = 1200
export const MAX_BACKGROUND_STORAGE_DIMENSION = 1800
export const MAX_BACKGROUND_UPLOAD_BYTES = 20_000_000
export const MAX_BACKGROUND_SOURCE_PIXELS = 60_000_000
const MAX_PRESERVED_DATA_URL_LENGTH = 3_000_000
const MAX_STORED_DATA_URL_LENGTH = 8_000_000

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

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image'))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode image'))
    image.src = dataUrl
  })
}

export async function prepareBackgroundImage(file: File, center: Point): Promise<BackgroundImage> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file')
  if (file.size > MAX_BACKGROUND_UPLOAD_BYTES) throw new Error('Image file is too large (20 MB max)')

  const original = await fileDataUrl(file)
  const image = await loadImage(original)
  const naturalWidth = Math.max(1, image.naturalWidth)
  const naturalHeight = Math.max(1, image.naturalHeight)
  if (naturalWidth * naturalHeight > MAX_BACKGROUND_SOURCE_PIXELS) {
    throw new Error('Image dimensions are too large')
  }

  // Small SVG underlays are already compact and remain vector in SVG export.
  if (file.type === 'image/svg+xml' && original.length <= MAX_PRESERVED_DATA_URL_LENGTH) {
    return fittedBackgroundImage(original, file.name, naturalWidth, naturalHeight, center)
  }

  const needsRasterization =
    file.type === 'image/gif' ||
    original.length > MAX_PRESERVED_DATA_URL_LENGTH ||
    Math.max(naturalWidth, naturalHeight) > MAX_BACKGROUND_STORAGE_DIMENSION

  if (!needsRasterization) {
    return fittedBackgroundImage(original, file.name, naturalWidth, naturalHeight, center)
  }

  const scale = Math.min(1, MAX_BACKGROUND_STORAGE_DIMENSION / Math.max(naturalWidth, naturalHeight))
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare image')
  context.drawImage(image, 0, 0, width, height)
  const dataUrl = canvas.toDataURL('image/webp', 0.86)
  if (dataUrl.length > MAX_STORED_DATA_URL_LENGTH) throw new Error('Prepared image is still too large')
  return fittedBackgroundImage(dataUrl, file.name, width, height, center)
}

export function clampBackgroundOpacity(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BACKGROUND_OPACITY
  return Math.min(1, Math.max(0.05, value))
}

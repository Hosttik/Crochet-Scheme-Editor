import type { StitchElement, Viewport } from '../types'
import { selectionAabb, type ElementSize, type Rect } from './selection'
import { clamp } from './geometry'

export function viewportForRect(
  bounds: Rect,
  screenWidth: number,
  screenHeight: number,
  marginPx = 56,
): Viewport {
  const width = Math.max(1, bounds.right - bounds.left)
  const height = Math.max(1, bounds.bottom - bounds.top)
  const availableWidth = Math.max(1, screenWidth - marginPx * 2)
  const availableHeight = Math.max(1, screenHeight - marginPx * 2)
  const zoom = clamp(Math.min(availableWidth / width, availableHeight / height), 0.1, 5)
  const centerX = (bounds.left + bounds.right) / 2
  const centerY = (bounds.top + bounds.bottom) / 2
  return {
    zoom,
    panX: screenWidth / 2 - centerX * zoom,
    panY: screenHeight / 2 - centerY * zoom,
  }
}

export function viewportForElements(
  elements: StitchElement[],
  sizes: Record<string, ElementSize>,
  screenWidth: number,
  screenHeight: number,
  selectedIds?: Iterable<string>,
): Viewport | null {
  const ids = selectedIds ?? elements.map((element) => element.id)
  const bounds = selectionAabb(elements, ids, sizes)
  return bounds ? viewportForRect(bounds, screenWidth, screenHeight) : null
}

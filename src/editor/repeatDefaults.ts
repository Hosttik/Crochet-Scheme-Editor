import type { StitchElement } from '../types'
import { stitchVisualSize } from './stitchGeometry'

export type RepeatDefaults = {
  deltaX: number
  deltaY: number
  guideSpacing: number
}

type Extent = {
  width: number
  height: number
}

function radians(value: number) {
  return (value * Math.PI) / 180
}

function visualExtent(element: StitchElement): Extent {
  const size = stitchVisualSize(element)
  const angle = radians(element.rotation)
  return {
    width: Math.abs(Math.cos(angle)) * size.width + Math.abs(Math.sin(angle)) * size.height,
    height: Math.abs(Math.sin(angle)) * size.width + Math.abs(Math.cos(angle)) * size.height,
  }
}

function selectedElements(elements: StitchElement[], ids: string[]) {
  const selected = new Set(ids)
  return elements.filter((element) => selected.has(element.id) && !element.parametricRow)
}

function averageConsecutiveStep(source: StitchElement[]) {
  if (source.length < 2) return null
  const xs = source.map((element) => element.x)
  const ys = source.map((element) => element.y)
  const rangeX = Math.max(...xs) - Math.min(...xs)
  const rangeY = Math.max(...ys) - Math.min(...ys)
  const horizontal = rangeX >= rangeY
  const sorted = [...source].sort((left, right) =>
    horizontal
      ? left.x - right.x || left.y - right.y
      : left.y - right.y || left.x - right.x,
  )
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const intervals = sorted.length - 1
  if (!first || !last || intervals < 1) return null
  const step = {
    x: (last.x - first.x) / intervals,
    y: (last.y - first.y) / intervals,
  }
  if (Math.hypot(step.x, step.y) < 1e-6) return null
  return step
}

export function repeatDefaults(elements: StitchElement[], ids: string[]): RepeatDefaults {
  const source = selectedElements(elements, ids)
  if (!source.length) return { deltaX: 48, deltaY: 0, guideSpacing: 48 }

  if (source.length === 1) {
    const extent = visualExtent(source[0])
    return {
      deltaX: Math.max(1, extent.width),
      deltaY: 0,
      guideSpacing: Math.max(1, Math.max(extent.width, extent.height)),
    }
  }

  const step = averageConsecutiveStep(source)
  if (step) {
    return {
      deltaX: step.x * source.length,
      deltaY: step.y * source.length,
      // repeatSelection already adds the motif span for multi-selection.
      guideSpacing: 0,
    }
  }

  const bounds = source.map((element) => {
    const extent = visualExtent(element)
    return {
      left: element.x - extent.width / 2,
      right: element.x + extent.width / 2,
      top: element.y - extent.height / 2,
      bottom: element.y + extent.height / 2,
    }
  })
  const width = Math.max(...bounds.map((item) => item.right)) - Math.min(...bounds.map((item) => item.left))
  const height = Math.max(...bounds.map((item) => item.bottom)) - Math.min(...bounds.map((item) => item.top))
  return width >= height
    ? { deltaX: Math.max(1, width), deltaY: 0, guideSpacing: 0 }
    : { deltaX: 0, deltaY: Math.max(1, height), guideSpacing: 0 }
}

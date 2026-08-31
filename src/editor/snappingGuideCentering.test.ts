import { describe, expect, it } from 'vitest'
import type { LineGuide, SnappingSettings, StitchElement, Viewport } from '../types'
import { anchorWorldPosition, solveSnap } from './snapping'

const viewport: Viewport = { zoom: 1, panX: 0, panY: 0 }
const settings: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'along',
  snapToVertices: true,
  tolerancePx: 12,
}

const line: LineGuide = {
  id: 'line-1',
  type: 'line',
  start: { x: 0, y: 100 },
  end: { x: 200, y: 100 },
  divisions: 2,
  visible: true,
}

function proposed(symbolId: string): StitchElement {
  return {
    id: '__preview__',
    symbolId,
    x: 80,
    y: 100,
    rotation: 0,
  }
}

describe('guide centering for compact construction stitches', () => {
  it('centers single crochet on the guide even when the global source anchor is bottom', () => {
    const result = solveSnap(proposed('single'), [], [line], settings, viewport, null)

    expect(result.candidate?.targetType).toBe('guide')
    expect(result.candidate?.targetId).toBe('line-1')
    expect(result.y).toBeCloseTo(100)

    const snapped = { ...proposed('single'), ...result }
    expect(anchorWorldPosition(snapped, 'center').y).toBeCloseTo(100)
  })
})

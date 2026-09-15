import { describe, expect, it } from 'vitest'
import type { GridGuide, SnappingSettings, StitchElement, Viewport } from '../types'
import { guideSnapPoints } from './guides'
import { solveSnap } from './snapping'

const viewport: Viewport = { zoom: 1, panX: 0, panY: 0 }
const settings: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'along',
  snapToVertices: true,
  tolerancePx: 12,
}

const grid: GridGuide = {
  id: 'grid-500',
  type: 'grid',
  origin: { x: 0, y: 0 },
  rows: 500,
  columns: 500,
  spacingX: 10,
  spacingY: 10,
  rotation: 0,
  visible: true,
}

function moving(x: number, y: number): StitchElement {
  return {
    id: 'moving',
    symbolId: 'single',
    x,
    y,
    rotation: 0,
  }
}

describe('large grid performance safeguards', () => {
  it('does not materialize 250k visual snap points for a 500x500 grid', () => {
    expect(guideSnapPoints(grid)).toEqual([])
  })

  it('still snaps to the nearest intersection on a 500x500 grid', () => {
    const result = solveSnap(moving(17, -23), [], [grid], settings, viewport, null)

    expect(result.candidate?.key).toBe('grid-500:grid:247:251')
    expect(result.x).toBeCloseTo(15)
    expect(result.y).toBeCloseTo(-25)
  })

  it('preserves grid hysteresis without enumerating every intersection', () => {
    const result = solveSnap(
      moving(34, -25),
      [],
      [grid],
      settings,
      viewport,
      'grid-500:grid:247:251',
    )

    expect(result.candidate?.key).toBe('grid-500:grid:247:251')
    expect(result.x).toBeCloseTo(15)
    expect(result.y).toBeCloseTo(-25)
  })
})

import { describe, expect, it } from 'vitest'
import type { SnappingSettings, StitchElement, Viewport } from '../types'
import {
  anchorWorldPosition,
  buildSnapCandidates,
  solveSnap,
} from './snapping'

const viewport: Viewport = { zoom: 1, panX: 0, panY: 0 }

const settings: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'none',
  snapToVertices: true,
  tolerancePx: 12,
}

const target: StitchElement = {
  id: 'target',
  symbolId: 'chain',
  x: 100,
  y: 100,
  rotation: 0,
}

function proposed(overrides: Partial<StitchElement> = {}): StitchElement {
  return {
    id: 'moving',
    symbolId: 'single',
    x: 100,
    y: 83,
    rotation: 0,
    ...overrides,
  }
}

describe('buildSnapCandidates', () => {
  it('includes top, center and bottom when vertex snapping is enabled', () => {
    const candidates = buildSnapCandidates([target], null, true)

    expect(candidates.map((candidate) => candidate.targetAnchor)).toEqual([
      'top',
      'center',
      'bottom',
    ])
  })

  it('includes only center when vertex snapping is disabled', () => {
    const candidates = buildSnapCandidates([target], null, false)

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.targetAnchor).toBe('center')
  })

  it('never creates candidates from the moving element itself', () => {
    expect(buildSnapCandidates([target], target.id, true)).toEqual([])
  })
})

describe('solveSnap', () => {
  it('returns the proposed transform unchanged when snapping is disabled', () => {
    const moving = proposed({ x: 94, y: 80, rotation: 5 })
    const result = solveSnap(
      moving,
      [target],
      { ...settings, enabled: false },
      viewport,
      null,
    )

    expect(result).toEqual({
      x: 94,
      y: 80,
      rotation: 5,
      candidate: null,
    })
  })

  it('aligns the selected source anchor with the nearest target anchor', () => {
    const result = solveSnap(proposed(), [target], settings, viewport, null)

    expect(result.candidate?.targetAnchor).toBe('center')
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(84)

    const snappedElement = { ...proposed(), ...result }
    expect(anchorWorldPosition(snappedElement, 'bottom')).toEqual({ x: 100, y: 100 })
  })

  it('uses screen-space distance for the snap threshold', () => {
    const moving = proposed({ y: 78 }) // bottom anchor is 6 document units from target center
    const result = solveSnap(
      moving,
      [target],
      { ...settings, snapToVertices: false },
      { ...viewport, zoom: 2 },
      null,
    )

    expect(result.candidate?.targetAnchor).toBe('center')
  })

  it('inherits target rotation in along mode', () => {
    const rotatedTarget = { ...target, rotation: 30 }
    const result = solveSnap(
      proposed({ y: 84 }),
      [rotatedTarget],
      { ...settings, snapToVertices: false, orientationMode: 'along' },
      viewport,
      null,
    )

    expect(result.rotation).toBe(30)
    const snappedElement = { ...proposed(), ...result }
    const targetCenter = anchorWorldPosition(rotatedTarget, 'center')
    expect(anchorWorldPosition(snappedElement, 'bottom').x).toBeCloseTo(targetCenter.x)
    expect(anchorWorldPosition(snappedElement, 'bottom').y).toBeCloseTo(targetCenter.y)
  })

  it('rotates 90 degrees relative to target in perpendicular mode', () => {
    const rotatedTarget = { ...target, rotation: 30 }
    const result = solveSnap(
      proposed({ y: 84 }),
      [rotatedTarget],
      { ...settings, snapToVertices: false, orientationMode: 'perpendicular' },
      viewport,
      null,
    )

    expect(result.rotation).toBe(120)
  })

  it('keeps a locked candidate inside the wider release threshold', () => {
    const result = solveSnap(
      proposed({ y: 100 }), // source anchor is 16px from target center
      [target],
      { ...settings, snapToVertices: false },
      viewport,
      'target:center',
    )

    expect(result.candidate?.key).toBe('target:center')
  })

  it('releases a locked candidate after leaving the hysteresis radius', () => {
    const result = solveSnap(
      proposed({ y: 103 }), // source anchor is 19px from target center
      [target],
      { ...settings, snapToVertices: false },
      viewport,
      'target:center',
    )

    expect(result.candidate).toBeNull()
    expect(result.y).toBe(103)
  })
})

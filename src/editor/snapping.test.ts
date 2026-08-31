import { describe, expect, it } from 'vitest'
import type { ArcGuide, LineGuide, SnappingSettings, StitchElement, Viewport } from '../types'
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

const arc: ArcGuide = {
  id: 'arc-1',
  type: 'arc',
  center: { x: 100, y: 100 },
  radius: 50,
  startAngle: 0,
  endAngle: 180,
  divisions: 4,
  visible: true,
}

const line: LineGuide = {
  id: 'line-1',
  type: 'line',
  start: { x: 0, y: 100 },
  end: { x: 200, y: 100 },
  divisions: 2,
  visible: true,
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
    const candidates = buildSnapCandidates([target], [], null, true)

    expect(candidates.map((candidate) => candidate.targetAnchor)).toEqual([
      'top',
      'center',
      'bottom',
    ])
  })

  it('includes only center for stitches when vertex snapping is disabled', () => {
    const candidates = buildSnapCandidates([target], [], null, false)

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.targetAnchor).toBe('center')
  })

  it('never creates candidates from the moving element itself', () => {
    expect(buildSnapCandidates([target], [], target.id, true)).toEqual([])
  })

  it('adds guide snap points to the same candidate set', () => {
    const candidates = buildSnapCandidates([], [arc], null, true)

    expect(candidates).toHaveLength(5)
    expect(candidates.every((candidate) => candidate.targetType === 'guide')).toBe(true)
  })
})

describe('solveSnap', () => {
  it('returns the proposed transform unchanged when snapping is disabled', () => {
    const moving = proposed({ x: 94, y: 80, rotation: 5 })
    const result = solveSnap(
      moving,
      [target],
      [],
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
    const result = solveSnap(proposed(), [target], [], settings, viewport, null)

    expect(result.candidate?.targetAnchor).toBe('center')
    expect(result.x).toBeCloseTo(100)
    expect(result.y).toBeCloseTo(84)

    const snappedElement = { ...proposed(), ...result }
    expect(anchorWorldPosition(snappedElement, 'bottom')).toEqual({ x: 100, y: 100 })
  })

  it('uses screen-space distance for the snap threshold', () => {
    const moving = proposed({ y: 78 })
    const result = solveSnap(
      moving,
      [target],
      [],
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
      [],
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
      [],
      { ...settings, snapToVertices: false, orientationMode: 'perpendicular' },
      viewport,
      null,
    )

    expect(result.rotation).toBe(120)
  })

  it('snaps to the guide under the placement crosshair and uses its tangent for orientation', () => {
    // Use a regular tall stitch here so this test remains about tangent/orientation
    // and source-anchor mechanics. Compact/single guide centering has its own
    // explicit regression below.
    const moving = proposed({ symbolId: 'double', x: 150, y: 100 })
    const result = solveSnap(
      moving,
      [],
      [arc],
      { ...settings, orientationMode: 'along' },
      viewport,
      null,
    )

    expect(result.candidate?.targetType).toBe('guide')
    expect(result.candidate?.targetId).toBe('arc-1')
    expect(result.rotation).toBeCloseTo(90)
    const snappedElement = { ...moving, ...result }
    expect(anchorWorldPosition(snappedElement, 'bottom').x).toBeCloseTo(150)
    expect(anchorWorldPosition(snappedElement, 'bottom').y).toBeCloseTo(100)
  })

  it('snaps to any point on a continuous path instead of only its configured divisions', () => {
    const moving = proposed({ symbolId: 'double', x: 73, y: 100 })
    const result = solveSnap(moving, [], [line], settings, viewport, null)

    expect(result.candidate?.targetId).toBe('line-1')
    expect(result.candidate?.pathT).toBeCloseTo(0.365, 2)
    expect(result.x).toBeCloseTo(73, 2)
    const snappedElement = { ...moving, ...result }
    expect(anchorWorldPosition(snappedElement, 'bottom').y).toBeCloseTo(100, 2)
  })

  it('uses a forgiving 24px acquisition corridor for guides', () => {
    const moving = proposed({ x: 73, y: 123 })
    const result = solveSnap(moving, [], [line], settings, viewport, null)

    expect(result.candidate?.targetType).toBe('guide')
    expect(result.candidate?.targetId).toBe('line-1')
  })

  it('does not acquire a guide outside the guide corridor', () => {
    const moving = proposed({ x: 73, y: 125 })
    const result = solveSnap(moving, [], [line], settings, viewport, null)

    expect(result.candidate).toBeNull()
  })

  it('prefers a guide inside its acquisition corridor over a competing stitch anchor', () => {
    const moving = proposed({ x: 100, y: 84 })
    const result = solveSnap(moving, [target], [line], settings, viewport, null)

    expect(result.candidate?.targetType).toBe('guide')
    expect(result.candidate?.targetId).toBe('line-1')
  })

  it('does not reuse a stale snap lock for a placement preview', () => {
    const moving = proposed({ id: '__preview__', x: 100, y: 84 })
    const result = solveSnap(moving, [target], [line], settings, viewport, 'target:center')

    expect(result.candidate?.targetType).toBe('guide')
    expect(result.candidate?.targetId).toBe('line-1')
  })

  it.each(['chain', 'slip', 'magic-ring', 'single'])('centers %s on a guide instead of shifting it by the bottom anchor', (symbolId) => {
    const moving = proposed({ symbolId, x: 73, y: 100 })
    const result = solveSnap(moving, [], [line], settings, viewport, null)

    expect(result.candidate?.targetId).toBe('line-1')
    expect(result.x).toBeCloseTo(73, 2)
    expect(result.y).toBeCloseTo(100, 2)
    const snappedElement = { ...moving, ...result }
    expect(anchorWorldPosition(snappedElement, 'center').y).toBeCloseTo(100, 2)
  })

  it('keeps a locked stitch candidate inside the element release threshold', () => {
    const result = solveSnap(
      proposed({ y: 100 }),
      [target],
      [],
      { ...settings, snapToVertices: false },
      viewport,
      'target:center',
    )

    expect(result.candidate?.key).toBe('target:center')
  })

  it('releases a locked stitch candidate after leaving the element hysteresis radius', () => {
    const result = solveSnap(
      proposed({ y: 103 }),
      [target],
      [],
      { ...settings, snapToVertices: false },
      viewport,
      'target:center',
    )

    expect(result.candidate).toBeNull()
    expect(result.y).toBe(103)
  })

  it('keeps a locked guide through a wider release corridor', () => {
    const result = solveSnap(
      proposed({ x: 80, y: 129 }),
      [],
      [line],
      settings,
      viewport,
      'line-1:line:nearest',
    )

    expect(result.candidate?.targetType).toBe('guide')
    expect(result.candidate?.targetId).toBe('line-1')
  })

  it('releases a locked guide once it leaves the guide release corridor', () => {
    const result = solveSnap(
      proposed({ x: 80, y: 131 }),
      [],
      [line],
      settings,
      viewport,
      'line-1:line:nearest',
    )

    expect(result.candidate).toBeNull()
    expect(result.y).toBe(131)
  })
})

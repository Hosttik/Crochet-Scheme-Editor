import { describe, expect, it } from 'vitest'
import type { CurveGuide, LineGuide, StitchElement } from '../types'
import {
  attachElementToGuide,
  moveAttachedElement,
  nearestPathParameter,
  pathPoseAt,
  reconcileGuideAttachments,
} from './pathGuides'

const line: LineGuide = {
  id: 'line',
  type: 'line',
  start: { x: 0, y: 0 },
  end: { x: 200, y: 0 },
  divisions: 10,
  visible: true,
}

const curve: CurveGuide = {
  id: 'curve',
  type: 'curve',
  start: { x: 0, y: 0 },
  control1: { x: 60, y: -100 },
  control2: { x: 140, y: 100 },
  end: { x: 200, y: 0 },
  divisions: 12,
  visible: true,
}

const stitch: StitchElement = {
  id: 'stitch',
  symbolId: 'single',
  x: 72,
  y: 28,
  rotation: 17,
}

describe('path guides', () => {
  it('evaluates line and cubic poses with tangent orientation', () => {
    expect(pathPoseAt(line, 0.5)).toEqual({ point: { x: 100, y: 0 }, tangent: 0 })
    expect(pathPoseAt(curve, 0).point).toEqual(curve.start)
    expect(pathPoseAt(curve, 1).point).toEqual(curve.end)
    expect(Number.isFinite(pathPoseAt(curve, 0.5).tangent)).toBe(true)
  })

  it('finds the nearest position on a path', () => {
    expect(nearestPathParameter(line, { x: 150, y: 40 })).toBeCloseTo(0.75, 2)
    const curveT = nearestPathParameter(curve, { x: 100, y: 0 })
    expect(curveT).toBeGreaterThan(0.35)
    expect(curveT).toBeLessThan(0.65)
  })

  it('attaches a stitch and follows guide edits', () => {
    const attached = attachElementToGuide(stitch, line, 'tangent')
    expect(attached.guideAttachment?.guideId).toBe('line')
    expect(attached.y).toBeCloseTo(0)
    expect(attached.rotation).toBeCloseTo(0)

    const movedGuide: LineGuide = {
      ...line,
      start: { x: 0, y: 80 },
      end: { x: 200, y: 80 },
    }
    const [reconciled] = reconcileGuideAttachments([attached], [movedGuide])
    expect(reconciled.y).toBeCloseTo(80)
    expect(reconciled.x).toBeCloseTo(attached.x)
  })

  it('slides an attached stitch along the same path instead of detaching it', () => {
    const attached = attachElementToGuide(stitch, line, 'normal')
    const moved = moveAttachedElement(attached, line, { x: 180, y: 90 })
    expect(moved.guideAttachment?.guideId).toBe('line')
    expect(moved.guideAttachment?.t).toBeCloseTo(0.9, 2)
    expect(moved.x).toBeCloseTo(180, 1)
    expect(moved.y).toBeCloseTo(0, 1)
    expect(moved.rotation).toBeCloseTo(90)
  })

  it('drops an attachment when its guide disappears', () => {
    const attached = attachElementToGuide(stitch, line, 'tangent')
    const [reconciled] = reconcileGuideAttachments([attached], [])
    expect(reconciled.guideAttachment).toBeUndefined()
  })
})

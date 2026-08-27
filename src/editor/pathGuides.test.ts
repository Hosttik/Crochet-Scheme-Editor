import { describe, expect, it } from 'vitest'
import type { ArcGuide, CurveGuide, LineGuide, ParabolaGuide, StitchElement } from '../types'
import { reverseGuide } from './guideGeometry'
import {
  attachElementToGuide,
  elementFromAttachment,
  isPathGuide,
  moveAttachedElement,
  nearestPathParameter,
  pathPoseAt,
  reconcileGuideAttachments,
  remapAttachmentsForReversedGuide,
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

  it('keeps attachment position and path side stable when reversing every continuous guide type', () => {
    const arc: ArcGuide = {
      id: 'arc', type: 'arc', center: { x: 80, y: 30 }, radius: 70,
      startAngle: 15, endAngle: 210, divisions: 12, visible: true,
    }
    const parabola: ParabolaGuide = {
      id: 'parabola', type: 'parabola', start: { x: 0, y: 30 },
      control: { x: 100, y: -80 }, end: { x: 200, y: 30 }, divisions: 12, visible: true,
    }
    for (const guide of [line, curve, arc, parabola]) {
      const attachment = {
        guideId: guide.id,
        t: 0.23,
        orientation: 'keep' as const,
        rotationOffset: 0,
        normalOffset: 12,
      }
      const positioned = elementFromAttachment({ ...stitch, id: `stitch-${guide.id}` }, guide, attachment)
      const reversed = reverseGuide(guide)
      expect(isPathGuide(reversed)).toBe(true)
      if (!isPathGuide(reversed)) throw new Error('Expected a path guide')
      const [remapped] = remapAttachmentsForReversedGuide([positioned], reversed)
      expect(remapped.x).toBeCloseTo(positioned.x, 6)
      expect(remapped.y).toBeCloseTo(positioned.y, 6)
      expect(remapped.rotation).toBeCloseTo(positioned.rotation, 6)
      expect(remapped.guideAttachment?.t).toBeCloseTo(0.77, 8)
      expect(remapped.guideAttachment?.normalOffset).toBe(-12)
    }
  })

  it('lets tangent-oriented stitches turn with the reversed work direction without jumping', () => {
    const attachment = { guideId: line.id, t: 0.3, orientation: 'tangent' as const, rotationOffset: 20, normalOffset: 9 }
    const positioned = elementFromAttachment(stitch, line, attachment)
    const reversed = reverseGuide(line)
    if (!isPathGuide(reversed)) throw new Error('Expected a path guide')
    const [remapped] = remapAttachmentsForReversedGuide([positioned], reversed)
    expect(remapped.x).toBeCloseTo(positioned.x, 6)
    expect(remapped.y).toBeCloseTo(positioned.y, 6)
    expect(Math.abs(remapped.rotation - positioned.rotation)).toBeCloseTo(180, 6)
  })

})

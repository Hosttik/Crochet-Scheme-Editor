import { describe, expect, it } from 'vitest'
import type { ArcGuide, CurveGuide, GridGuide, LineGuide, ParabolaGuide, RadialGridGuide } from '../types'
import { applyGuideManipulation, gridRotationHandle, guideCenter, guideResizeHandle } from './guideManipulation'

const arc: ArcGuide = {
  id: 'arc',
  type: 'arc',
  center: { x: 100, y: 80 },
  radius: 60,
  startAngle: 0,
  endAngle: 180,
  divisions: 6,
  visible: true,
}

const line: LineGuide = {
  id: 'line',
  type: 'line',
  start: { x: 0, y: 10 },
  end: { x: 120, y: 30 },
  divisions: 6,
  visible: true,
}

const curve: CurveGuide = {
  id: 'curve',
  type: 'curve',
  start: { x: 0, y: 0 },
  control1: { x: 40, y: -60 },
  control2: { x: 80, y: 60 },
  end: { x: 120, y: 0 },
  divisions: 8,
  visible: true,
}

const parabola: ParabolaGuide = {
  id: 'parabola', type: 'parabola', start: { x: -100, y: 0 }, control: { x: 0, y: -80 }, end: { x: 100, y: 0 }, divisions: 12, visible: true,
}

const grid: GridGuide = {
  id: 'grid',
  type: 'grid',
  origin: { x: 20, y: 30 },
  rows: 3,
  columns: 5,
  spacingX: 20,
  spacingY: 20,
  rotation: 15,
  visible: true,
}

const radial: RadialGridGuide = {
  id: 'radial',
  type: 'radial-grid',
  center: { x: 0, y: 0 },
  ringCount: 4,
  ringSpacing: 25,
  sectorCount: 8,
  startAngle: 0,
  visible: true,
}

describe('guide direct manipulation', () => {
  it('moves an arc by pointer delta', () => {
    const next = applyGuideManipulation(arc, 'move', { x: 10, y: 10 }, { x: 35, y: 5 })
    expect(next.type).toBe('arc')
    if (next.type === 'arc') expect(next.center).toEqual({ x: 125, y: 75 })
  })

  it('moves a line as one object and edits its endpoints independently', () => {
    const moved = applyGuideManipulation(line, 'move', { x: 0, y: 0 }, { x: 20, y: 30 })
    expect(moved.type).toBe('line')
    if (moved.type === 'line') {
      expect(moved.start).toEqual({ x: 20, y: 40 })
      expect(moved.end).toEqual({ x: 140, y: 60 })
    }

    const edited = applyGuideManipulation(line, 'end', line.end, { x: 180, y: 75 })
    expect(edited.type).toBe('line')
    if (edited.type === 'line') {
      expect(edited.start).toEqual(line.start)
      expect(edited.end).toEqual({ x: 180, y: 75 })
    }
  })

  it('moves all cubic points together and exposes a center pose', () => {
    const moved = applyGuideManipulation(curve, 'move', { x: 5, y: 5 }, { x: 15, y: 25 })
    expect(moved.type).toBe('curve')
    if (moved.type === 'curve') {
      expect(moved.start).toEqual({ x: 10, y: 20 })
      expect(moved.control1).toEqual({ x: 50, y: -40 })
      expect(moved.control2).toEqual({ x: 90, y: 80 })
      expect(moved.end).toEqual({ x: 130, y: 20 })
    }
    expect(guideCenter(curve).x).toBeCloseTo(60)
  })

  it('edits cubic control points independently', () => {
    const edited = applyGuideManipulation(curve, 'control1', curve.control1, { x: 50, y: -90 })
    expect(edited.type).toBe('curve')
    if (edited.type === 'curve') {
      expect(edited.control1).toEqual({ x: 50, y: -90 })
      expect(edited.control2).toEqual(curve.control2)
    }
  })

  it('moves and edits a quadratic parabola with one control point', () => {
    const moved = applyGuideManipulation(parabola, 'move', { x: 0, y: 0 }, { x: 10, y: 20 })
    expect(moved.type).toBe('parabola')
    if (moved.type === 'parabola') {
      expect(moved.start).toEqual({ x: -90, y: 20 })
      expect(moved.control).toEqual({ x: 10, y: -60 })
      expect(moved.end).toEqual({ x: 110, y: 20 })
    }
    const edited = applyGuideManipulation(parabola, 'control', parabola.control, { x: 5, y: -120 })
    expect(edited.type).toBe('parabola')
    if (edited.type === 'parabola') expect(edited.control).toEqual({ x: 5, y: -120 })
  })

  it('resizes an arc from its center', () => {
    const next = applyGuideManipulation(arc, 'resize', { x: 0, y: 0 }, { x: 100, y: 180 })
    expect(next.type).toBe('arc')
    if (next.type === 'arc') expect(next.radius).toBeCloseTo(100)
  })

  it('resizes a radial grid by changing ring spacing from the outer radius', () => {
    const next = applyGuideManipulation(radial, 'resize', { x: 100, y: 0 }, { x: 160, y: 0 })
    expect(next.type).toBe('radial-grid')
    if (next.type === 'radial-grid') expect(next.ringSpacing).toBeCloseTo(40)
  })

  it('moves a rectangular grid without changing its rotation', () => {
    const next = applyGuideManipulation(grid, 'move', { x: 5, y: 5 }, { x: 15, y: 25 })
    expect(next.type).toBe('grid')
    if (next.type === 'grid') {
      expect(next.origin).toEqual({ x: 30, y: 50 })
      expect(next.rotation).toBe(15)
    }
  })

  it('rotates a grid relative to the pointer angle delta', () => {
    const start = { x: 20, y: -70 }
    const current = { x: 120, y: 30 }
    const next = applyGuideManipulation(grid, 'rotate', start, current)
    expect(next.type).toBe('grid')
    if (next.type === 'grid') expect(next.rotation).toBeCloseTo(105)
  })

  it('snaps grid rotation to 15 degree increments when requested', () => {
    const start = { x: 20, y: -70 }
    const current = { x: 111, y: 12 }
    const free = applyGuideManipulation(grid, 'rotate', start, current)
    const snapped = applyGuideManipulation(grid, 'rotate', start, current, true)
    expect(free.type).toBe('grid')
    expect(snapped.type).toBe('grid')
    if (free.type === 'grid' && snapped.type === 'grid') {
      expect(snapped.rotation % 15).toBeCloseTo(0)
      expect(snapped.rotation).not.toBeCloseTo(free.rotation)
    }
  })

  it('snaps a dragged line endpoint to 15 degree increments with Shift', () => {
    const current = { x: 100, y: 100 }
    const free = applyGuideManipulation(line, 'end', line.end, current)
    const snapped = applyGuideManipulation(line, 'end', line.end, current, true)
    expect(free.type).toBe('line')
    expect(snapped.type).toBe('line')
    if (free.type === 'line' && snapped.type === 'line') {
      const snappedAngle = Math.atan2(snapped.end.y - line.start.y, snapped.end.x - line.start.x) * 180 / Math.PI
      expect(snappedAngle / 15).toBeCloseTo(Math.round(snappedAngle / 15))
      expect(snapped.end).not.toEqual(free.end)
      expect(Math.hypot(snapped.end.x - line.start.x, snapped.end.y - line.start.y)).toBeCloseTo(
        Math.hypot(current.x - line.start.x, current.y - line.start.y),
      )
    }
  })

  it('provides visible resize and rotation handles only where they apply', () => {
    expect(guideResizeHandle(arc)).not.toBeNull()
    expect(guideResizeHandle(radial)).not.toBeNull()
    expect(guideResizeHandle(line)).toBeNull()
    expect(guideResizeHandle(curve)).toBeNull()
    expect(gridRotationHandle(grid)).not.toBeNull()
  })
})

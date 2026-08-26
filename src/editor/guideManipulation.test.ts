import { describe, expect, it } from 'vitest'
import type { ArcGuide, GridGuide, RadialGridGuide } from '../types'
import { applyGuideManipulation, gridRotationHandle, guideResizeHandle } from './guideManipulation'

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

  it('provides visible resize and rotation handles', () => {
    expect(guideResizeHandle(arc)).not.toBeNull()
    expect(guideResizeHandle(radial)).not.toBeNull()
    expect(gridRotationHandle(grid)).not.toBeNull()
  })
})

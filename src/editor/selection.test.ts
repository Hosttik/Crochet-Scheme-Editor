import { describe, expect, it } from 'vitest'
import {
  elementAabb,
  idsInMarquee,
  normalizeRect,
  pointerAngle,
  rotationFromPointer,
  selectionAabb,
} from './selection'
import type { StitchElement } from '../types'

const sizes = {
  single: { width: 20, height: 40 },
}

const element = (overrides: Partial<StitchElement> = {}): StitchElement => ({
  id: 'a',
  symbolId: 'single',
  x: 100,
  y: 100,
  rotation: 0,
  ...overrides,
})

describe('selection geometry', () => {
  it('normalizes marquee regardless of drag direction', () => {
    expect(normalizeRect({ x: 20, y: 30 }, { x: 5, y: 10 })).toEqual({
      left: 5,
      top: 10,
      right: 20,
      bottom: 30,
    })
  })

  it('computes a rotated AABB', () => {
    const bounds = elementAabb(element({ rotation: 90 }), sizes.single)
    expect(bounds.left).toBeCloseTo(80)
    expect(bounds.right).toBeCloseTo(120)
    expect(bounds.top).toBeCloseTo(90)
    expect(bounds.bottom).toBeCloseTo(110)
  })

  it('selects elements intersecting a marquee', () => {
    const elements = [
      element(),
      element({ id: 'b', x: 250, y: 250 }),
    ]
    expect(
      idsInMarquee(elements, { left: 80, top: 70, right: 120, bottom: 130 }, sizes),
    ).toEqual(['a'])
  })

  it('computes bounds for multiple selected elements', () => {
    const bounds = selectionAabb(
      [element(), element({ id: 'b', x: 200, y: 100 })],
      ['a', 'b'],
      sizes,
    )
    expect(bounds).toEqual({ left: 82, top: 72, right: 218, bottom: 128 })
  })

  it('calculates pointer angle in degrees', () => {
    expect(pointerAngle({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90)
  })

  it('rotates relative to the initial pointer angle and can snap to 15 degrees', () => {
    expect(rotationFromPointer(10, 0, 25)).toBeCloseTo(35)
    expect(rotationFromPointer(10, 0, 25, true)).toBe(30)
  })
})

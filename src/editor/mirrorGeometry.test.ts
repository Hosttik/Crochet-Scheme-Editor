import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import {
  mirrorElementsAcrossLine,
  mirrorElementsToward,
  mirrorLineForDirection,
} from './productivity'

const source: StitchElement[] = [
  { id: 'a', symbolId: 'single', x: 10, y: 20, rotation: 30 },
  { id: 'b', symbolId: 'double', x: 50, y: 40, rotation: -15 },
]

describe('mirror geometry', () => {
  it('reflects across an arbitrary diagonal and toggles glyph parity', () => {
    const mirrored = mirrorElementsAcrossLine(source, ['a'], {
      point: { x: 0, y: 0 },
      angle: 45,
    })
    expect(mirrored[0].x).toBeCloseTo(20)
    expect(mirrored[0].y).toBeCloseTo(10)
    expect(mirrored[0].rotation).toBeCloseTo(-120)
    expect(mirrored[0].mirrored).toBe(true)
    expect(mirrored[1]).toEqual(source[1])

    const restored = mirrorElementsAcrossLine(mirrored, ['a'], {
      point: { x: 0, y: 0 },
      angle: 45,
    })
    expect(restored[0].x).toBeCloseTo(source[0].x)
    expect(restored[0].y).toBeCloseTo(source[0].y)
    expect(restored[0].rotation).toBeCloseTo(source[0].rotation)
    expect(restored[0].mirrored).toBe(false)
  })

  it('builds directional axes at the selection edge and moves a reflection outward', () => {
    const line = mirrorLineForDirection(source, ['a', 'b'], 'right')
    expect(line).not.toBeNull()
    expect(line?.angle).toBe(90)
    const mirrored = mirrorElementsToward(source, ['a', 'b'], 'right')
    expect(Math.min(...mirrored.map((element) => element.x))).toBeGreaterThan(Math.min(...source.map((element) => element.x)))
    expect(mirrored.every((element) => element.mirrored === true)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { repeatDefaults } from './repeatDefaults'

function stitch(id: string, x: number, y: number, symbolId = 'single'): StitchElement {
  return { id, symbolId, x, y, rotation: 0 }
}

describe('repeatDefaults', () => {
  it('uses the visual width of a single stitch instead of a magic 48px step', () => {
    const element = stitch('a', 100, 100, 'chain')
    const defaults = repeatDefaults([element], ['a'])

    expect(defaults.deltaX).toBeGreaterThan(0)
    expect(defaults.deltaX).not.toBe(48)
    expect(defaults.deltaY).toBe(0)
    expect(defaults.guideSpacing).toBeGreaterThanOrEqual(defaults.deltaX)
  })

  it('continues the spacing chosen by the user for a horizontal sequence', () => {
    const elements = [stitch('a', 100, 100), stitch('b', 150, 100)]
    const defaults = repeatDefaults(elements, ['a', 'b'])

    expect(defaults.deltaX).toBeCloseTo(100)
    expect(defaults.deltaY).toBeCloseTo(0)
    expect(defaults.guideSpacing).toBe(0)
  })

  it('continues a diagonal sequence as a vector instead of forcing horizontal copies', () => {
    const elements = [
      stitch('a', 100, 100),
      stitch('b', 130, 120),
      stitch('c', 160, 140),
    ]
    const defaults = repeatDefaults(elements, ['a', 'b', 'c'])

    expect(defaults.deltaX).toBeCloseTo(90)
    expect(defaults.deltaY).toBeCloseTo(60)
  })

  it('ignores unselected stitches', () => {
    const elements = [
      stitch('a', 100, 100),
      stitch('b', 150, 100),
      stitch('outside', 900, 900),
    ]
    const defaults = repeatDefaults(elements, ['a', 'b'])

    expect(defaults.deltaX).toBeCloseTo(100)
    expect(defaults.deltaY).toBeCloseTo(0)
  })
})

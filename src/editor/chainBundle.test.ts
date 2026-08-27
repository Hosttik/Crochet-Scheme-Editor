import { describe, expect, it } from 'vitest'
import { semanticSelectionIds } from './selectionModel'
import { CHAIN_BUNDLE_SPACING, chainBundleLayout, createChainBundle } from './chainBundle'

describe('chain bundle presets', () => {
  it('centers the requested number of real chain stitches', () => {
    const points = chainBundleLayout({ x: 100, y: 200 }, 3)
    expect(points).toEqual([
      { x: 100 - CHAIN_BUNDLE_SPACING, y: 200 },
      { x: 100, y: 200 },
      { x: 100 + CHAIN_BUNDLE_SPACING, y: 200 },
    ])
  })

  it('rotates the whole chain layout around its placement center', () => {
    const points = chainBundleLayout({ x: 10, y: 20 }, 2, 90)
    expect(points[0].x).toBeCloseTo(10)
    expect(points[0].y).toBeCloseTo(9)
    expect(points[1].x).toBeCloseTo(10)
    expect(points[1].y).toBeCloseTo(31)
  })

  it('creates ordinary chain elements in one semantic selection group', () => {
    let serial = 0
    const bundle = createChainBundle({ x: 0, y: 0 }, 4, 15, () => `id-${++serial}`)
    expect(bundle).toHaveLength(4)
    expect(bundle.every((element) => element.symbolId === 'chain')).toBe(true)
    expect(new Set(bundle.map((element) => element.id)).size).toBe(4)
    expect(new Set(bundle.map((element) => element.groupId)).size).toBe(1)
    expect(bundle.every((element) => element.rotation === 15)).toBe(true)

    const selected = semanticSelectionIds(bundle, [bundle[2].id])
    expect(new Set(selected)).toEqual(new Set(bundle.map((element) => element.id)))
  })
})

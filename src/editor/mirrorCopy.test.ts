import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { createMirroredCopy } from './mirrorCopy'

function ids() {
  let index = 0
  return () => `new-${++index}`
}

const motif: StitchElement[] = [
  { id: 'a', symbolId: 'single', x: 10, y: 20, rotation: 0 },
  { id: 'b', symbolId: 'double', x: 30, y: 40, rotation: 30 },
]

describe('mirrored copy', () => {
  it('creates an adjacent left/right mirrored motif and groups it', () => {
    const copy = createMirroredCopy(motif, ['a', 'b'], 'left-right', 24, ids())
    expect(copy).toHaveLength(2)
    expect(copy[0].x).toBeGreaterThan(30)
    expect(copy[1].x).toBeGreaterThan(30)
    expect(copy[0]).toMatchObject({ rotation: 0, mirrored: true })
    expect(copy[1]).toMatchObject({ rotation: -30, mirrored: true })
    expect(copy[0].groupId).toBeTruthy()
    expect(copy[0].groupId).toBe(copy[1].groupId)
  })

  it('creates an adjacent top/bottom mirrored stitch', () => {
    const copy = createMirroredCopy([motif[0]], ['a'], 'top-bottom', 24, ids())
    expect(copy).toHaveLength(1)
    expect(copy[0].y).toBeGreaterThan(44)
    expect(copy[0]).toMatchObject({ rotation: -180, mirrored: true })
  })

  it('keeps the requested visual gap for a wide magic-ring symbol', () => {
    const ring: StitchElement = {
      id: 'ring', symbolId: 'magic-ring', x: 10, y: 20, rotation: 0,
    }
    const copy = createMirroredCopy([ring], ['ring'], 'left-right', 24, ids())
    expect(copy).toHaveLength(1)
    // Magic ring is 38 px wide: 29 + 24 + 19 = 72 for the copied center.
    expect(copy[0].x).toBeCloseTo(72, 6)
  })
})

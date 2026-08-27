import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { createMirroredCopyAroundAxis } from './mirrorCopy'
import { mirrorElementsAroundAxis } from './productivity'

const source: StitchElement[] = [
  {
    id: 'a',
    symbolId: 'single',
    x: 10,
    y: 20,
    rotation: 15,
    visible: true,
    locked: false,
    guideAttachment: {
      guideId: 'guide',
      t: 0.25,
      orientation: 'tangent',
      rotationOffset: 0,
      normalOffset: 0,
    },
  },
  { id: 'b', symbolId: 'double', x: 30, y: 40, rotation: -30, visible: true, locked: false },
  { id: 'c', symbolId: 'chain', x: -20, y: 5, rotation: 5, visible: true, locked: false },
]

function ids() {
  let index = 0
  return () => `copy-${++index}`
}

describe('custom mirror axis', () => {
  it('reflects selected stitches across an explicit vertical axis', () => {
    const mirrored = mirrorElementsAroundAxis(source, ['a', 'b'], 'left-right', 100)

    expect(mirrored[0]).toMatchObject({ x: 190, y: 20, rotation: -15, mirrored: true })
    expect(mirrored[0].guideAttachment).toBeUndefined()
    expect(mirrored[1]).toMatchObject({ x: 170, y: 40, rotation: 30, mirrored: true })
    expect(mirrored[2]).toEqual(source[2])
  })

  it('reflects selected stitches across an explicit horizontal axis', () => {
    const mirrored = mirrorElementsAroundAxis(source, ['a'], 'top-bottom', -20)

    expect(mirrored[0]).toMatchObject({ x: 10, y: -60, rotation: 165, mirrored: true })
    expect(mirrored[1]).toEqual(source[1])
  })

  it('creates detached grouped copies on the opposite side of a custom axis', () => {
    const created = createMirroredCopyAroundAxis(source, ['a', 'b'], 'left-right', 100, ids())

    expect(created).toHaveLength(2)
    expect(created[0]).toMatchObject({ x: 190, y: 20, rotation: -15, mirrored: true, locked: false })
    expect(created[1]).toMatchObject({ x: 170, y: 40, rotation: 30, mirrored: true, locked: false })
    expect(created[0].id).not.toBe('a')
    expect(created[1].id).not.toBe('b')
    expect(created[0].guideAttachment).toBeUndefined()
    expect(created[0].groupId).toBeTruthy()
    expect(created[0].groupId).toBe(created[1].groupId)
    expect(source).toHaveLength(3)
  })
})

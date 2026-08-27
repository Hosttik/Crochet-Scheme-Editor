import { describe, expect, it } from 'vitest'
import type { BackgroundImage } from '../types'
import {
  backgroundCorners,
  backgroundImageBounds,
  moveBackground,
  resizeBackgroundFromCorner,
  rotateBackgroundFromPointer,
} from './backgroundGeometry'

const background: BackgroundImage = {
  dataUrl: 'data:image/png;base64,abc',
  x: 10,
  y: 20,
  width: 200,
  height: 100,
  rotation: 0,
  opacity: 0.5,
}

describe('background canvas geometry', () => {
  it('computes the AABB of a rotated image', () => {
    const bounds = backgroundImageBounds({ ...background, rotation: 90 })
    expect(bounds.width).toBeCloseTo(100)
    expect(bounds.height).toBeCloseTo(200)
    expect(bounds.left).toBeCloseTo(60)
    expect(bounds.top).toBeCloseTo(-30)
  })

  it('moves without changing size or rotation', () => {
    expect(moveBackground({ ...background, rotation: 20 }, 30, -15)).toMatchObject({
      x: 40, y: 5, width: 200, height: 100, rotation: 20,
    })
  })

  it('resizes from a corner while keeping the opposite corner fixed', () => {
    const resized = resizeBackgroundFromCorner(background, 'se', { x: 310, y: 170 })
    expect(resized).toMatchObject({ x: 10, y: 20, width: 300, height: 150 })
  })

  it('preserves the source aspect ratio while Shift-resizing', () => {
    const resized = resizeBackgroundFromCorner(background, 'se', { x: 310, y: 120 }, true)
    expect(resized.width / resized.height).toBeCloseTo(2)
  })

  it('rotates around the center and Shift-snaps to 15 degrees', () => {
    const center = { x: 110, y: 70 }
    const start = { x: center.x, y: center.y - 100 }
    const current = { x: center.x + 100, y: center.y }
    const rotated = rotateBackgroundFromPointer(background, start, current, true)
    expect(rotated.rotation).toBe(90)
    expect(rotated.x).toBe(background.x)
    expect(rotated.y).toBe(background.y)
  })

  it('keeps the opposite world-space corner fixed while resizing a rotated image', () => {
    const rotated = { ...background, rotation: 37 }
    const before = backgroundCorners(rotated).nw
    const resized = resizeBackgroundFromCorner(rotated, 'se', { x: 330, y: 210 })
    const after = backgroundCorners(resized).nw
    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
  })

})

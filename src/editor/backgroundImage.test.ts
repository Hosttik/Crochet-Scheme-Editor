import { describe, expect, it } from 'vitest'
import { clampBackgroundOpacity, fittedBackgroundImage } from './backgroundImage'

describe('background image helpers', () => {
  it('centers and scales large images into document space', () => {
    const image = fittedBackgroundImage('data:image/png;base64,abc', 'photo.png', 2400, 1200, { x: 100, y: 50 })
    expect(image.width).toBe(1200)
    expect(image.height).toBe(600)
    expect(image.x).toBe(-500)
    expect(image.y).toBe(-250)
    expect(image.opacity).toBe(0.45)
    expect(image.includeInExport).toBe(false)
  })

  it('clamps opacity to the usable range', () => {
    expect(clampBackgroundOpacity(-1)).toBe(0.05)
    expect(clampBackgroundOpacity(0.4)).toBe(0.4)
    expect(clampBackgroundOpacity(2)).toBe(1)
  })
})

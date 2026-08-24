import { describe, expect, it } from 'vitest'
import { viewportForElements, viewportForRect } from './viewportFit'

const sizes = { single: { width: 20, height: 20 } }

describe('viewport fitting', () => {
  it('centers a rectangle and respects margins', () => {
    const viewport = viewportForRect({ left: 0, top: 0, right: 100, bottom: 50 }, 500, 300, 50)
    expect(viewport.zoom).toBe(4)
    expect(viewport.panX).toBe(50)
    expect(viewport.panY).toBe(50)
  })

  it('fits only selected elements when ids are supplied', () => {
    const elements = [
      { id: 'a', symbolId: 'single', x: 0, y: 0, rotation: 0 },
      { id: 'b', symbolId: 'single', x: 1000, y: 0, rotation: 0 },
    ]
    const selected = viewportForElements(elements, sizes, 400, 300, ['a'])
    const all = viewportForElements(elements, sizes, 400, 300)
    expect(selected).not.toBeNull()
    expect(all).not.toBeNull()
    expect(selected!.zoom).toBeGreaterThan(all!.zoom)
  })

  it('returns null for an empty document', () => {
    expect(viewportForElements([], sizes, 400, 300)).toBeNull()
  })
})

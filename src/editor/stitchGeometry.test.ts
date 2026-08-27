import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import {
  documentPointToElementLocal,
  geometryFromHandleDrag,
  normalizedStitchGeometry,
  resolvedStitchGeometry,
  stitchLocalAnchor,
  stitchVisualSize,
  supportsSemanticSpread,
} from './stitchGeometry'

function element(symbolId = 'double', geometry?: StitchElement['geometry']): StitchElement {
  return { id: 'stitch', symbolId, x: 100, y: 80, rotation: 0, geometry }
}

describe('stitch geometry', () => {
  it('scales visual size and snapping anchors from the same geometry', () => {
    const item = element('double', { scaleX: 1.5, scaleY: 2 })
    expect(stitchVisualSize(item)).toEqual({ width: 45, height: 116 })
    expect(stitchLocalAnchor(item, 'top')).toEqual({ x: 0, y: -58 })
    expect(stitchLocalAnchor(item, 'bottom')).toEqual({ x: 0, y: 58 })
  })

  it('keeps semantic spread independent from overall height', () => {
    const item = element('double-5-shell', { scaleY: 1.4, spread: 1.8 })
    const size = stitchVisualSize(item)
    expect(size.width).toBeCloseTo(68 * 1.8, 6)
    expect(size.height).toBeCloseTo(60 * 1.4, 6)
    expect(resolvedStitchGeometry(item)).toEqual({ scaleX: 1, scaleY: 1.4, spread: 1.8 })
    expect(supportsSemanticSpread(item.symbolId)).toBe(true)
  })

  it('does not persist spread for ordinary symbols', () => {
    expect(normalizedStitchGeometry('double', { spread: 2, scaleY: 1.2 })).toEqual({ scaleY: 1.2 })
    expect(supportsSemanticSpread('double')).toBe(false)
  })

  it('uniform handle scales both axes while height handle only changes height', () => {
    const item = element('double', { scaleX: 1.2, scaleY: 1.5 })
    expect(geometryFromHandleDrag(item, 'uniform', { x: 20, y: 20 }, { x: 40, y: 40 })).toMatchObject({
      scaleX: 2.4,
      scaleY: 3,
    })
    expect(geometryFromHandleDrag(item, 'height', { x: 0, y: -40 }, { x: 0, y: -20 })).toMatchObject({
      scaleX: 1.2,
      scaleY: 0.75,
    })
  })

  it('spread handle changes branch spacing without changing outer scale', () => {
    const item = element('double-3-in-1', { scaleX: 1.2, scaleY: 1.3, spread: 1.1 })
    expect(geometryFromHandleDrag(item, 'spread', { x: 30, y: 0 }, { x: 45, y: 0 })).toMatchObject({
      scaleX: 1.2,
      scaleY: 1.3,
      spread: 1.65,
    })
  })

  it('converts document pointers into the rotated element frame', () => {
    const item = { ...element(), rotation: 90 }
    const local = documentPointToElementLocal(item, { x: 100, y: 100 })
    expect(local.x).toBeCloseTo(20, 6)
    expect(local.y).toBeCloseTo(0, 6)
  })
})

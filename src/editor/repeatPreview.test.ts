import { describe, expect, it } from 'vitest'
import type { StitchElement } from '../types'
import { repeatPreviewSelectionKind, shouldShowRepeatPreview } from './repeatPreview'

function stitch(id: string, groupId?: string): StitchElement {
  return { id, symbolId: 'single', x: 0, y: 0, rotation: 0, groupId }
}

describe('repeat preview selection semantics', () => {
  const elements = [
    stitch('a'),
    stitch('b'),
    stitch('g1-a', 'g1'),
    stitch('g1-b', 'g1'),
    stitch('g2-a', 'g2'),
    stitch('g2-b', 'g2'),
  ]

  it('shows preview for one stitch and one complete group', () => {
    expect(repeatPreviewSelectionKind(elements, ['a'])).toBe('single-stitch')
    expect(shouldShowRepeatPreview(repeatPreviewSelectionKind(elements, ['a']))).toBe(true)

    expect(repeatPreviewSelectionKind(elements, ['g1-a', 'g1-b'])).toBe('single-group')
    expect(shouldShowRepeatPreview(repeatPreviewSelectionKind(elements, ['g1-a', 'g1-b']))).toBe(true)
  })

  it('hides preview for temporary multi-selection and multiple groups', () => {
    expect(repeatPreviewSelectionKind(elements, ['a', 'b'])).toBe('multiple')
    expect(shouldShowRepeatPreview(repeatPreviewSelectionKind(elements, ['a', 'b']))).toBe(false)

    expect(repeatPreviewSelectionKind(elements, ['g1-a', 'g1-b', 'g2-a', 'g2-b'])).toBe('multiple')
    expect(shouldShowRepeatPreview(repeatPreviewSelectionKind(elements, ['g1-a', 'g1-b', 'g2-a', 'g2-b']))).toBe(false)
  })
})

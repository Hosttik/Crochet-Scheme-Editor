import { describe, expect, it } from 'vitest'
import type { ParametricRowBinding, StitchElement } from '../types'
import {
  formatPatternRowInstruction,
  generatePatternInstructions,
  patternInstructionsMarkdown,
  stitchAbbreviation,
} from './patternInstructions'

function binding(
  id: string,
  count: number,
  shaping?: ParametricRowBinding['shaping'],
  parentRowId?: string,
): ParametricRowBinding {
  return {
    id,
    guideId: 'guide',
    symbolId: 'single',
    patternOrder: Number(id.replace(/\D/g, '')) || 1,
    parentRowId,
    shaping,
    options: {
      distributionMode: 'count',
      count,
      spacing: 40,
      orientation: 'radial',
      rotationOffset: 0,
      radialOffset: 0,
      ringIndex: 1,
    },
  }
}

function row(rowBinding: ParametricRowBinding, count: number): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${rowBinding.id}-${index}`,
    symbolId: rowBinding.symbolId,
    x: index,
    y: 0,
    rotation: 0,
    parametricRow: rowBinding,
  }))
}

describe('pattern instructions', () => {
  it('uses standard crochet abbreviations', () => {
    expect(stitchAbbreviation('single', 'ru')).toBe('СБН')
    expect(stitchAbbreviation('double', 'ru')).toBe('ССН')
    expect(stitchAbbreviation('single', 'en')).toBe('SC')
  })

  it('formats an unshaped row as a direct stitch count', () => {
    const first = binding('row-1', 6)
    expect(formatPatternRowInstruction(first, 1, 6, 'ru')).toBe('Ряд 1: 6 СБН = 6')
  })

  it('formats evenly divisible increases as a compact repeat', () => {
    const third = binding(
      'row-3',
      30,
      { kind: 'increase', count: 6, baseCount: 24 },
      'row-2',
    )
    expect(formatPatternRowInstruction(third, 3, 30, 'ru')).toBe(
      'Ряд 3: (3 СБН, прибавка) × 6 = 30',
    )
  })

  it('formats all-stitch increases without a zero-stitch repeat', () => {
    const second = binding(
      'row-2',
      12,
      { kind: 'increase', count: 6, baseCount: 6 },
      'row-1',
    )
    expect(formatPatternRowInstruction(second, 2, 12, 'ru')).toBe(
      'Ряд 2: 6 прибавок = 12',
    )
  })

  it('formats decreases using stitches consumed by a decrease', () => {
    const decreased = binding(
      'row-2',
      18,
      { kind: 'decrease', count: 6, baseCount: 24 },
      'row-1',
    )
    expect(formatPatternRowInstruction(decreased, 2, 18, 'ru')).toBe(
      'Ряд 2: (2 СБН, убавка) × 6 = 18',
    )
  })

  it('falls back to an honest evenly-spaced description when no exact repeat exists', () => {
    const irregular = binding(
      'row-2',
      23,
      { kind: 'increase', count: 5, baseCount: 18 },
      'row-1',
    )
    expect(formatPatternRowInstruction(irregular, 2, 23, 'ru')).toBe(
      'Ряд 2: 18 СБН, 5 равномерных прибавок = 23',
    )
  })

  it('describes manual increase positions instead of claiming they are even', () => {
    const manual = {
      ...binding('row-2', 10, { kind: 'increase', count: 2, baseCount: 8 }, 'row-1'),
      topologyOverride: { changeParentIds: ['row-1-4', 'row-1-7'] },
    }
    expect(formatPatternRowInstruction(manual, 2, 10, 'ru', [5, 8])).toBe(
      'Ряд 2: 8 СБН; прибавки в петли 5, 8 = 10',
    )
  })

  it('describes manual decrease pairs explicitly', () => {
    const manual = {
      ...binding('row-2', 6, { kind: 'decrease', count: 2, baseCount: 8 }, 'row-1'),
      topologyOverride: { changeParentIds: ['row-1-3', 'row-1-7'] },
    }
    expect(formatPatternRowInstruction(manual, 2, 6, 'ru', [4, 8])).toBe(
      'Ряд 2: 8 СБН; убавки на парах 3–4, 7–8 = 6',
    )
  })

  it('generates rows in pattern order and a markdown abbreviation legend', () => {
    const first = binding('row-1', 6)
    const second = binding(
      'row-2',
      12,
      { kind: 'increase', count: 6, baseCount: 6 },
      'row-1',
    )
    const elements = [...row(second, 12), ...row(first, 6)]
    const instructions = generatePatternInstructions(elements, 'ru')
    expect(instructions.map((item) => item.text)).toEqual([
      'Ряд 1: 6 СБН = 6',
      'Ряд 2: 6 прибавок = 12',
    ])
    expect(instructions[1].parentRowNumber).toBe(1)

    const markdown = patternInstructionsMarkdown(elements, 'ru')
    expect(markdown).toContain('# Схема вязания')
    expect(markdown).toContain('**СБН** — Столбик без накида')
  })
})

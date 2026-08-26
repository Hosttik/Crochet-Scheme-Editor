import { describe, expect, it } from 'vitest'
import type { ParametricRowBinding, StitchElement } from '../types'
import {
  formatPatternRowInstruction,
  generatePatternInstructions,
  patternInstructionsMarkdown,
} from './patternInstructions'

function binding(construction: NonNullable<ParametricRowBinding['construction']>): ParametricRowBinding {
  return {
    id: 'row-1',
    guideId: 'guide',
    symbolId: 'single',
    construction,
    options: {
      distributionMode: 'count', count: 12, spacing: 40,
      orientation: 'radial', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
    },
  }
}

function elements(rowBinding: ParametricRowBinding): StitchElement[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `s-${index}`,
    symbolId: 'single',
    x: index,
    y: 0,
    rotation: 0,
    parametricRow: rowBinding,
  }))
}

describe('construction-aware pattern instructions', () => {
  it('describes a joined round without changing its stitch total', () => {
    const row = binding({
      mode: 'joined', direction: 'along', startChainCount: 2, joinWithSlipStitch: true,
    })
    expect(formatPatternRowInstruction(row, 2, 12, 'ru')).toBe(
      'Ряд 2: 2 ВП подъёма (вне счёта ряда); 12 СБН = 12; замкнутый круг ↻; замкнуть СС в первую провязанную петлю',
    )
  })

  it('reports a counted starting chain as one logical stitch without changing worked elements', () => {
    const row = binding({
      mode: 'joined',
      direction: 'along',
      startChainCount: 3,
      startChainCountsAsStitch: true,
      skipFirstStitches: 1,
      joinWithSlipStitch: true,
      joinTarget: 'start-chain-top',
    })
    const rowElements = elements(row)
    expect(formatPatternRowInstruction(row, 1, 12, 'ru')).toBe(
      'Ряд 1: 3 ВП подъёма (считаются первой петлёй ряда); пропустить 1 петлю основания; 12 СБН = 12; всего в счёте ряда: 13; замкнутый круг ↻; замкнуть СС в верхнюю ВП подъёма',
    )
    expect(rowElements).toHaveLength(12)
    expect(generatePatternInstructions(rowElements, 'ru')[0]).toMatchObject({
      stitchCount: 12,
      rowTotalCount: 13,
    })
  })

  it('describes turning direction and includes auxiliary construction abbreviations in markdown', () => {
    const row = binding({
      mode: 'turning', direction: 'reverse', startChainCount: 1, joinWithSlipStitch: false,
    })
    expect(formatPatternRowInstruction(row, 3, 12, 'en')).toBe(
      'Row 3: 1 starting CH (not counted in row total); 12 SC = 12; turning row ←; turn work',
    )

    const joined = binding({
      mode: 'joined', direction: 'along', startChainCount: 1, joinWithSlipStitch: true,
    })
    const markdown = patternInstructionsMarkdown(elements(joined), 'ru')
    expect(markdown).toContain('**ВП** — Воздушная петля')
    expect(markdown).toContain('**СС** — Соединительный столбик')
  })
})

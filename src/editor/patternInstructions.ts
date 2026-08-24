import { SYMBOL_BY_ID } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type { ParametricRowBinding, RowSequenceItem, RowShaping, StitchElement } from '../types'
import { patternRows, rowElements } from './parametricRows'
import {
  normalizeRowSequence,
  rowHasMixedSequence,
  rowSequenceCycleInfo,
  rowSequenceRunsForCount,
} from './rowSequence'

export type PatternInstructionRow = {
  rowId: string
  rowNumber: number
  symbolId: string
  stitchCount: number
  parentRowNumber?: number
  text: string
}

const ABBREVIATIONS: Record<string, Record<Locale, string>> = {
  chain: { ru: 'ВП', en: 'CH' },
  slip: { ru: 'СС', en: 'SL ST' },
  single: { ru: 'СБН', en: 'SC' },
  'half-double': { ru: 'ПСН', en: 'HDC' },
  double: { ru: 'ССН', en: 'DC' },
  treble: { ru: 'СС2Н', en: 'TR' },
  picot: { ru: 'пико', en: 'picot' },
  'magic-ring': { ru: 'КА', en: 'MR' },
}

const COPY = {
  ru: {
    row: 'Ряд',
    increase: 'прибавка',
    increases: 'прибавок',
    decrease: 'убавка',
    decreases: 'убавок',
    evenly: 'равномерных',
    atStitches: 'прибавки в петли',
    acrossPairs: 'убавки на парах',
    marked: 'по отмеченным позициям',
    title: 'Схема вязания',
    abbreviations: 'Сокращения',
  },
  en: {
    row: 'Row',
    increase: 'increase',
    increases: 'increases',
    decrease: 'decrease',
    decreases: 'decreases',
    evenly: 'evenly spaced',
    atStitches: 'increases in stitches',
    acrossPairs: 'decreases across pairs',
    marked: 'at marked positions',
    title: 'Crochet pattern',
    abbreviations: 'Abbreviations',
  },
} as const

export function stitchAbbreviation(symbolId: string, locale: Locale) {
  return ABBREVIATIONS[symbolId]?.[locale] ?? symbolId
}

function actionLabel(
  shaping: RowShaping,
  symbolId: string,
  locale: Locale,
  plural = false,
) {
  const copy = COPY[locale]
  const generic = shaping.kind === 'increase'
    ? plural ? copy.increases : copy.increase
    : plural ? copy.decreases : copy.decrease

  if (symbolId === 'single') return generic
  const abbreviation = stitchAbbreviation(symbolId, locale)
  return locale === 'ru'
    ? `${generic} (${abbreviation})`
    : `${abbreviation} ${generic}`
}

function formatSequenceRuns(items: RowSequenceItem[], locale: Locale) {
  return items
    .map((item) => `${item.count} ${stitchAbbreviation(item.symbolId, locale)}`)
    .join(', ')
}

function mixedSequenceComposition(
  binding: ParametricRowBinding,
  targetCount: number,
  locale: Locale,
) {
  if (!rowHasMixedSequence(binding)) return null
  const sequence = normalizeRowSequence(binding.sequence)
  if (!sequence) return null

  const cycle = rowSequenceCycleInfo(sequence, targetCount)
  const template = formatSequenceRuns(sequence.items, locale)
  const parts: string[] = []
  if (cycle.repeats === 1) parts.push(template)
  else if (cycle.repeats > 1) parts.push(`(${template}) × ${cycle.repeats}`)
  if (cycle.remainder) {
    const remainder = rowSequenceRunsForCount(sequence, cycle.remainder, binding.symbolId)
    parts.push(formatSequenceRuns(remainder, locale))
  }
  return parts.join(' + ') || formatSequenceRuns(
    rowSequenceRunsForCount(sequence, targetCount, binding.symbolId),
    locale,
  )
}

function mixedShapingDetail(
  binding: ParametricRowBinding,
  locale: Locale,
  parentPositions?: number[],
) {
  const shaping = binding.shaping
  if (!shaping) return null
  const copy = COPY[locale]

  if (binding.topologyOverride) {
    if (!parentPositions || parentPositions.length !== shaping.count) {
      const generic = shaping.kind === 'increase' ? copy.increases : copy.decreases
      return `${shaping.count} ${generic} ${copy.marked}`
    }
    if (shaping.kind === 'increase') {
      return `${copy.atStitches} ${parentPositions.join(', ')}`
    }
    const pairs = parentPositions.map((second) => `${Math.max(1, second - 1)}–${second}`)
    return `${copy.acrossPairs} ${pairs.join(', ')}`
  }

  const generic = shaping.kind === 'increase' ? copy.increases : copy.decreases
  return `${shaping.count} ${copy.evenly} ${generic}`
}

function compactShapingBody(
  binding: ParametricRowBinding,
  targetCount: number,
  locale: Locale,
) {
  const shaping = binding.shaping
  if (!shaping || shaping.count <= 0 || binding.topologyOverride) return null

  const base = Math.max(1, Math.round(shaping.baseCount))
  const changes = Math.max(1, Math.round(shaping.count))
  if (base % changes !== 0) return null

  const consumedPerRepeat = base / changes
  const plainCount = shaping.kind === 'increase'
    ? consumedPerRepeat - 1
    : consumedPerRepeat - 2
  if (plainCount < 0) return null

  const stitch = stitchAbbreviation(binding.symbolId, locale)
  const action = actionLabel(shaping, binding.symbolId, locale)
  if (plainCount === 0) {
    return `${changes} ${actionLabel(shaping, binding.symbolId, locale, true)} = ${targetCount}`
  }
  return `(${plainCount} ${stitch}, ${action}) × ${changes} = ${targetCount}`
}

function manualTopologyBody(
  binding: ParametricRowBinding,
  targetCount: number,
  locale: Locale,
  parentPositions?: number[],
) {
  const shaping = binding.shaping
  const topology = binding.topologyOverride
  if (!shaping || !topology) return null

  const copy = COPY[locale]
  const stitch = stitchAbbreviation(binding.symbolId, locale)
  const base = Math.max(1, Math.round(shaping.baseCount))
  if (!parentPositions || parentPositions.length !== shaping.count) {
    const action = actionLabel(shaping, binding.symbolId, locale, true)
    return `${base} ${stitch}, ${shaping.count} ${action} ${copy.marked} = ${targetCount}`
  }

  if (shaping.kind === 'increase') {
    return `${base} ${stitch}; ${copy.atStitches} ${parentPositions.join(', ')} = ${targetCount}`
  }

  const pairs = parentPositions.map((second) => `${Math.max(1, second - 1)}–${second}`)
  return `${base} ${stitch}; ${copy.acrossPairs} ${pairs.join(', ')} = ${targetCount}`
}

function fallbackShapingBody(
  binding: ParametricRowBinding,
  targetCount: number,
  locale: Locale,
) {
  const shaping = binding.shaping
  if (!shaping) return null
  const copy = COPY[locale]
  const stitch = stitchAbbreviation(binding.symbolId, locale)
  const changes = Math.max(1, Math.round(shaping.count))
  const action = actionLabel(shaping, binding.symbolId, locale, true)
  const base = Math.max(1, Math.round(shaping.baseCount))
  return `${base} ${stitch}, ${changes} ${copy.evenly} ${action} = ${targetCount}`
}

export function formatPatternRowInstruction(
  binding: ParametricRowBinding,
  rowNumber: number,
  stitchCount: number,
  locale: Locale,
  parentPositions?: number[],
) {
  const prefix = `${COPY[locale].row} ${rowNumber}: `
  const composition = mixedSequenceComposition(binding, stitchCount, locale)
  if (composition) {
    const shaping = mixedShapingDetail(binding, locale, parentPositions)
    return `${prefix}${composition}${shaping ? `; ${shaping}` : ''} = ${stitchCount}`
  }

  const shaped = manualTopologyBody(binding, stitchCount, locale, parentPositions)
    ?? compactShapingBody(binding, stitchCount, locale)
    ?? fallbackShapingBody(binding, stitchCount, locale)
  if (shaped) return prefix + shaped

  const stitch = stitchAbbreviation(binding.symbolId, locale)
  return `${prefix}${stitchCount} ${stitch} = ${stitchCount}`
}

export function generatePatternInstructions(
  elements: StitchElement[],
  locale: Locale,
): PatternInstructionRow[] {
  const rows = patternRows(elements)
  const rowNumberById = new Map(rows.map((row) => [row.id, row.displayOrder]))

  return rows.map((row) => {
    let parentPositions: number[] | undefined
    if (row.binding.topologyOverride && row.binding.parentRowId) {
      const parents = rowElements(elements, row.binding.parentRowId)
      const indexById = new Map(parents.map((parent, index) => [parent.id, index + 1]))
      const positions = row.binding.topologyOverride.changeParentIds
        .map((id) => indexById.get(id))
        .filter((position): position is number => position !== undefined)
      if (positions.length === row.binding.topologyOverride.changeParentIds.length) {
        parentPositions = positions
      }
    }

    return {
      rowId: row.id,
      rowNumber: row.displayOrder,
      symbolId: row.binding.symbolId,
      stitchCount: row.stitchCount,
      parentRowNumber: row.binding.parentRowId
        ? rowNumberById.get(row.binding.parentRowId)
        : undefined,
      text: formatPatternRowInstruction(
        row.binding,
        row.displayOrder,
        row.stitchCount,
        locale,
        parentPositions,
      ),
    }
  })
}

export function usedPatternAbbreviations(elements: StitchElement[], locale: Locale) {
  const seen = new Set<string>()
  const result: Array<{ abbreviation: string; name: string }> = []

  for (const row of patternRows(elements)) {
    const symbolIds = row.binding.sequence?.items.map((item) => item.symbolId) ?? [row.binding.symbolId]
    for (const symbolId of symbolIds) {
      if (seen.has(symbolId)) continue
      seen.add(symbolId)
      const definition = SYMBOL_BY_ID.get(symbolId)
      result.push({
        abbreviation: stitchAbbreviation(symbolId, locale),
        name: symbolName(symbolId, definition?.name ?? symbolId, locale),
      })
    }
  }

  return result
}

export function patternInstructionsText(elements: StitchElement[], locale: Locale) {
  return generatePatternInstructions(elements, locale).map((row) => row.text).join('\n')
}

export function patternInstructionsMarkdown(elements: StitchElement[], locale: Locale) {
  const rows = generatePatternInstructions(elements, locale)
  const abbreviations = usedPatternAbbreviations(elements, locale)
  const lines = [`# ${COPY[locale].title}`, '']
  lines.push(...rows.map((row) => row.text))

  if (abbreviations.length) {
    lines.push('', `## ${COPY[locale].abbreviations}`, '')
    lines.push(...abbreviations.map(({ abbreviation, name }) => `- **${abbreviation}** — ${name}`))
  }

  return lines.join('\n')
}

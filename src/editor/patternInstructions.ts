import { SYMBOL_BY_ID } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type {
  ParametricRowBinding,
  RowProgramItem,
  RowProgramLeaf,
  RowSequenceItem,
  RowShaping,
  StitchElement,
} from '../types'
import { patternRows, rowElements } from './parametricRows'
import { normalizeRowProgram, rowProgramMetrics } from './rowProgram'
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
    programMismatch: 'ожидается по раппорту',
    actual: 'фактически',
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
    programMismatch: 'rapport expects',
    actual: 'actual',
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

function programLeafText(leaf: RowProgramLeaf, locale: Locale) {
  const abbreviation = stitchAbbreviation(leaf.symbolId, locale)
  if (leaf.kind === 'stitch') return `${leaf.count} ${abbreviation}`
  const word = leaf.kind === 'increase'
    ? leaf.count === 1 ? COPY[locale].increase : COPY[locale].increases
    : leaf.count === 1 ? COPY[locale].decrease : COPY[locale].decreases
  return locale === 'ru'
    ? `${leaf.count === 1 ? '' : `${leaf.count} `}${word} (${abbreviation})`
    : `${leaf.count === 1 ? '' : `${leaf.count} `}${abbreviation} ${word}`
}

function programItemText(item: RowProgramItem, locale: Locale) {
  if (item.kind !== 'group') return programLeafText(item, locale)
  const body = item.items.map((leaf) => programLeafText(leaf, locale)).join(', ')
  return item.repeat === 1 ? body : `(${body}) × ${item.repeat}`
}

function richProgramComposition(
  binding: ParametricRowBinding,
  stitchCount: number,
  locale: Locale,
) {
  const program = normalizeRowProgram(binding.program)
  if (!program) return null
  const body = program.items.map((item) => programItemText(item, locale)).join(', ')
  const expression = program.repeat === 1 ? body : `[${body}] × ${program.repeat}`
  const metrics = rowProgramMetrics(program)
  if (metrics.producedChildren === stitchCount) return expression
  const copy = COPY[locale]
  return `${expression}; ${copy.programMismatch} ${metrics.producedChildren}, ${copy.actual} ${stitchCount}`
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
  const program = richProgramComposition(binding, stitchCount, locale)
  if (program) return `${prefix}${program} = ${stitchCount}`

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

function programSymbolIds(binding: ParametricRowBinding) {
  const program = normalizeRowProgram(binding.program)
  if (!program) return []
  const ids: string[] = []
  for (const item of program.items) {
    if (item.kind === 'group') ids.push(...item.items.map((leaf) => leaf.symbolId))
    else ids.push(item.symbolId)
  }
  return ids
}

export function usedPatternAbbreviations(elements: StitchElement[], locale: Locale) {
  const seen = new Set<string>()
  const result: Array<{ abbreviation: string; name: string }> = []

  for (const row of patternRows(elements)) {
    const richIds = programSymbolIds(row.binding)
    const symbolIds = richIds.length
      ? richIds
      : row.binding.sequence?.items.map((item) => item.symbolId) ?? [row.binding.symbolId]
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

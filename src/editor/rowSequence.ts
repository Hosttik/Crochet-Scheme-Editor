import type { ParametricRowBinding, RowSequence, RowSequenceItem } from '../types'

const MAX_ITEM_COUNT = 500

export function normalizeRowSequenceItems(items: RowSequenceItem[]): RowSequenceItem[] {
  const normalized: RowSequenceItem[] = []
  for (const item of items) {
    const symbolId = item.symbolId.trim()
    const count = Math.max(1, Math.min(MAX_ITEM_COUNT, Math.round(item.count)))
    if (!symbolId) continue
    const previous = normalized.at(-1)
    if (previous?.symbolId === symbolId) previous.count += count
    else normalized.push({ symbolId, count })
  }
  return normalized
}

export function normalizeRowSequence(sequence?: RowSequence): RowSequence | undefined {
  if (!sequence) return undefined
  const items = normalizeRowSequenceItems(sequence.items)
  return items.length ? { items } : undefined
}

export function rowSequenceTemplateLength(sequence?: RowSequence) {
  return normalizeRowSequence(sequence)?.items.reduce((sum, item) => sum + item.count, 0) ?? 0
}

export function rowSequenceSymbolIds(
  sequence: RowSequence | undefined,
  count: number,
  fallbackSymbolId: string,
) {
  const normalized = normalizeRowSequence(sequence)
  const target = Math.max(0, Math.round(count))
  if (!normalized) return Array.from({ length: target }, () => fallbackSymbolId)

  const template = normalized.items.flatMap((item) => Array.from({ length: item.count }, () => item.symbolId))
  if (!template.length) return Array.from({ length: target }, () => fallbackSymbolId)
  return Array.from({ length: target }, (_, index) => template[index % template.length])
}

export function rowSequenceCycleInfo(sequence: RowSequence | undefined, count: number) {
  const templateLength = rowSequenceTemplateLength(sequence)
  const target = Math.max(0, Math.round(count))
  if (!templateLength) return { templateLength: 0, repeats: 0, remainder: target }
  return {
    templateLength,
    repeats: Math.floor(target / templateLength),
    remainder: target % templateLength,
  }
}

export function rowSequenceRunsForCount(
  sequence: RowSequence | undefined,
  count: number,
  fallbackSymbolId: string,
) {
  const symbolIds = rowSequenceSymbolIds(sequence, count, fallbackSymbolId)
  const runs: RowSequenceItem[] = []
  for (const symbolId of symbolIds) {
    const previous = runs.at(-1)
    if (previous?.symbolId === symbolId) previous.count += 1
    else runs.push({ symbolId, count: 1 })
  }
  return runs
}

export function rowBindingSymbolIds(binding: ParametricRowBinding, count: number) {
  return rowSequenceSymbolIds(binding.sequence, count, binding.symbolId)
}

export function rowHasMixedSequence(binding: ParametricRowBinding) {
  const normalized = normalizeRowSequence(binding.sequence)
  if (!normalized) return false
  return normalized.items.length > 1 || normalized.items[0]?.symbolId !== binding.symbolId
}

import type { Guide, ParametricRowBinding, StitchElement } from '../types'
import {
  generateGuideRowPlacements,
  resolveGuideRowCount,
  rowPlacementsToElements,
} from './rowGenerator'

export type ParametricIdFactory = () => string

export type PatternRowSummary = {
  id: string
  binding: ParametricRowBinding
  stitchCount: number
  firstElementIndex: number
  displayOrder: number
}

function uniqueBindings(elements: StitchElement[]) {
  const bindings = new Map<string, ParametricRowBinding>()
  for (const element of elements) {
    const binding = element.parametricRow
    if (binding && !bindings.has(binding.id)) bindings.set(binding.id, binding)
  }
  return [...bindings.values()]
}

export function rowElements(elements: StitchElement[], rowId: string) {
  return elements.filter((element) => element.parametricRow?.id === rowId)
}

export function patternRows(elements: StitchElement[]): PatternRowSummary[] {
  const summaries = uniqueBindings(elements).map((binding, sourceIndex) => {
    const firstElementIndex = elements.findIndex((element) => element.parametricRow?.id === binding.id)
    return {
      id: binding.id,
      binding,
      stitchCount: rowElements(elements, binding.id).length,
      firstElementIndex,
      sourceOrder: sourceIndex + 1,
      displayOrder: 0,
    }
  })

  summaries.sort((left, right) => {
    const leftOrder = left.binding.patternOrder ?? left.sourceOrder
    const rightOrder = right.binding.patternOrder ?? right.sourceOrder
    return leftOrder - rightOrder || left.firstElementIndex - right.firstElementIndex
  })

  return summaries.map(({ sourceOrder: _sourceOrder, ...summary }, index) => ({
    ...summary,
    displayOrder: index + 1,
  }))
}

export function nextPatternOrder(elements: StitchElement[]) {
  const rows = patternRows(elements)
  const explicitOrders = rows
    .map((row) => row.binding.patternOrder)
    .filter((value): value is number => Number.isFinite(value))
  return Math.max(rows.length, ...explicitOrders, 0) + 1
}

export function parametricRowFromSelection(
  elements: StitchElement[],
  selectedIds: string[],
): ParametricRowBinding | null {
  if (!selectedIds.length) return null
  const selected = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selected.has(element.id))
  if (
    selectedElements.length !== selectedIds.length ||
    selectedElements.some((element) => !element.parametricRow)
  ) return null

  const rowIds = new Set(selectedElements.map((element) => element.parametricRow!.id))
  if (rowIds.size !== 1) return null
  return selectedElements[0]?.parametricRow ?? null
}

export function expandIdsToParametricRows(elements: StitchElement[], ids: string[]) {
  const expanded = new Set(ids)
  const rowIds = new Set<string>()
  for (const element of elements) {
    if (expanded.has(element.id) && element.parametricRow) rowIds.add(element.parametricRow.id)
  }
  if (!rowIds.size) return [...expanded]
  for (const element of elements) {
    if (element.parametricRow && rowIds.has(element.parametricRow.id)) expanded.add(element.id)
  }
  return [...expanded]
}

function replaceRowBlock(
  elements: StitchElement[],
  rowId: string,
  replacement: StitchElement[],
) {
  const firstIndex = elements.findIndex((element) => element.parametricRow?.id === rowId)
  const withoutRow = elements.filter((element) => element.parametricRow?.id !== rowId)
  if (firstIndex < 0) return [...withoutRow, ...replacement]
  const insertionIndex = Math.min(firstIndex, withoutRow.length)
  return [
    ...withoutRow.slice(0, insertionIndex),
    ...replacement,
    ...withoutRow.slice(insertionIndex),
  ]
}

export function reconcileParametricRows(
  elements: StitchElement[],
  guides: Guide[],
  idFactory: ParametricIdFactory,
): StitchElement[] {
  let next = [...elements]
  const guideById = new Map(guides.map((guide) => [guide.id, guide]))

  for (const binding of uniqueBindings(elements)) {
    const existing = rowElements(next, binding.id)
    const guide = guideById.get(binding.guideId)

    if (!guide || guide.type === 'grid') {
      next = next.map((element) =>
        element.parametricRow?.id === binding.id
          ? { ...element, parametricRow: undefined }
          : element,
      )
      continue
    }

    const placements = generateGuideRowPlacements(guide, binding.options)
    const regenerated = rowPlacementsToElements(
      placements,
      binding.symbolId,
      (_placement, index) => existing[index]?.id ?? idFactory(),
    ).map((element, index) => ({
      ...element,
      visible: existing[index]?.visible ?? true,
      locked: existing[index]?.locked ?? false,
      parametricRow: binding,
    }))

    next = replaceRowBlock(next, binding.id, regenerated)
  }

  return next
}

export function updateParametricRow(
  elements: StitchElement[],
  guides: Guide[],
  rowId: string,
  binding: ParametricRowBinding,
  idFactory: ParametricIdFactory,
) {
  const rebound = elements.map((element) =>
    element.parametricRow?.id === rowId
      ? { ...element, symbolId: binding.symbolId, parametricRow: binding }
      : element,
  )
  return reconcileParametricRows(rebound, guides, idFactory)
}

export function createNextPatternRow(
  elements: StitchElement[],
  guides: Guide[],
  parent: ParametricRowBinding,
  countIncrement: number,
  idFactory: ParametricIdFactory,
) {
  const guide = guides.find((item) => item.id === parent.guideId)
  if (!guide || guide.type === 'grid') return null

  const baseCount = resolveGuideRowCount(guide, parent.options)
  const radialStep = guide.type === 'radial-grid' ? Math.max(1, guide.ringSpacing) : 40
  const binding: ParametricRowBinding = {
    id: idFactory(),
    guideId: parent.guideId,
    symbolId: parent.symbolId,
    patternOrder: nextPatternOrder(elements),
    parentRowId: parent.id,
    options: {
      ...parent.options,
      distributionMode: 'count',
      count: Math.max(1, Math.min(500, baseCount + countIncrement)),
      radialOffset: parent.options.radialOffset + radialStep,
    },
  }

  const placements = generateGuideRowPlacements(guide, binding.options)
  const generated = rowPlacementsToElements(
    placements,
    binding.symbolId,
    () => idFactory(),
  ).map((element) => ({ ...element, parametricRow: binding }))

  return { binding, elements: generated }
}

export function deleteParametricRow(elements: StitchElement[], rowId: string) {
  return elements.filter((element) => element.parametricRow?.id !== rowId)
}

export function detachParametricRow(elements: StitchElement[], rowId: string) {
  return elements.map((element) =>
    element.parametricRow?.id === rowId
      ? { ...element, parametricRow: undefined }
      : element,
  )
}

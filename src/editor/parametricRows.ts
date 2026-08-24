import type { Guide, ParametricRowBinding, StitchElement } from '../types'
import { generateGuideRowPlacements, rowPlacementsToElements } from './rowGenerator'

export type ParametricIdFactory = () => string

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

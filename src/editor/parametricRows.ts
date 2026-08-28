import type { Guide, ParametricRowBinding, RowShapingKind, StitchElement } from '../types'
import {
  generateGuideRowPlacements,
  resolveGuideRowCount,
  rowPlacementsToElements,
} from './rowGenerator'
import { nextRowConstruction, rowConstructionTopologyParents } from './rowConstruction'
import { createRowShaping, targetCountForRowShaping } from './rowShaping'
import {
  applyCompiledProgram,
  compileRowProgram,
  rowProgramSymbolIds,
} from './rowProgram'
import { rowBindingSymbolIds } from './rowSequence'
import { applyRowTopology, isTopologyOverrideValid } from './topology'

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

function applyBindingSymbols(elements: StitchElement[], binding: ParametricRowBinding) {
  const programSymbols = binding.program ? rowProgramSymbolIds(binding.program) : null
  const symbolIds = programSymbols?.length === elements.length
    ? programSymbols
    : rowBindingSymbolIds(binding, elements.length)
  return elements.map((element, index) => ({
    ...element,
    symbolId: symbolIds[index] ?? binding.symbolId,
    parametricRow: binding,
  }))
}

function reconcileTopology(elements: StitchElement[]) {
  let next = [...elements]
  for (const binding of uniqueBindings(next)) {
    if (!binding.parentRowId) {
      const unlinkedBinding = binding.topologyOverride
        ? { ...binding, topologyOverride: undefined }
        : binding
      next = replaceRowBlock(
        next,
        binding.id,
        rowElements(next, binding.id).map((element) => ({
          ...element,
          parentStitchIds: undefined,
          parametricRow: unlinkedBinding,
        })),
      )
      continue
    }

    const parents = rowElements(next, binding.parentRowId)
    const children = rowElements(next, binding.id)
    if (!parents.length) {
      const detachedChildren = children.map((element) => ({
        ...element,
        parentStitchIds: undefined,
        parametricRow: element.parametricRow
          ? {
              ...element.parametricRow,
              parentRowId: undefined,
              generatedRadialOffset: undefined,
              shaping: undefined,
              topologyOverride: undefined,
            }
          : undefined,
      }))
      next = replaceRowBlock(next, binding.id, detachedChildren)
      continue
    }

    const topologyParents = rowConstructionTopologyParents(parents, binding.construction)

    if (binding.program) {
      const compiled = compileRowProgram(binding.program, topologyParents)
      const resolvedBinding = binding.shaping || binding.topologyOverride
        ? { ...binding, shaping: undefined, topologyOverride: undefined }
        : binding
      const reboundChildren = children.map((element) => ({
        ...element,
        parametricRow: resolvedBinding,
      }))
      next = replaceRowBlock(next, binding.id, applyCompiledProgram(reboundChildren, compiled))
      continue
    }

    const topologyOverride = isTopologyOverrideValid(topologyParents, binding.shaping, binding.topologyOverride)
      ? binding.topologyOverride
      : undefined
    const resolvedBinding = topologyOverride === binding.topologyOverride
      ? binding
      : { ...binding, topologyOverride: undefined }
    const reboundChildren = children.map((element) => ({
      ...element,
      parametricRow: resolvedBinding,
    }))
    next = replaceRowBlock(
      next,
      binding.id,
      applyRowTopology(reboundChildren, topologyParents, binding.shaping, topologyOverride),
    )
  }
  return next
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

    if (!guide || (guide.type !== 'arc' && guide.type !== 'radial-grid')) {
      next = next.map((element) =>
        element.parametricRow?.id === binding.id
          ? { ...element, parametricRow: undefined, parentStitchIds: undefined }
          : element,
      )
      continue
    }

    const uniformColor = existing.length > 0 && existing.every(
      (element) => element.color === existing[0]?.color,
    )
      ? existing[0]?.color
      : undefined
    const placements = generateGuideRowPlacements(guide, binding.options)
    const regenerated = rowPlacementsToElements(
      placements,
      binding.symbolId,
      (_placement, index) => existing[index]?.id ?? idFactory(),
    ).map((element, index) => ({
      ...element,
      color: existing[index]?.color ?? uniformColor,
      visible: existing[index]?.visible ?? true,
      locked: existing[index]?.locked ?? false,
    }))

    next = replaceRowBlock(next, binding.id, applyBindingSymbols(regenerated, binding))
  }

  return reconcileTopology(next)
}

export function updateParametricRow(
  elements: StitchElement[],
  guides: Guide[],
  rowId: string,
  binding: ParametricRowBinding,
  idFactory: ParametricIdFactory,
) {
  if (rowElements(elements, rowId).some((element) => element.locked === true)) return elements
  const rebound = elements.map((element) =>
    element.parametricRow?.id === rowId
      ? { ...element, parametricRow: binding }
      : element,
  )
  return reconcileParametricRows(rebound, guides, idFactory)
}

function shapingKindFromIncrement(countIncrement: number): RowShapingKind | null {
  if (countIncrement > 0) return 'increase'
  if (countIncrement < 0) return 'decrease'
  return null
}

export function createNextPatternRow(
  elements: StitchElement[],
  guides: Guide[],
  parent: ParametricRowBinding,
  countIncrement: number,
  idFactory: ParametricIdFactory,
) {
  const guide = guides.find((item) => item.id === parent.guideId)
  if (!guide || (guide.type !== 'arc' && guide.type !== 'radial-grid')) return null

  const construction = nextRowConstruction(parent.construction)
  const parentElements = rowElements(elements, parent.id)
  const topologyParents = rowConstructionTopologyParents(parentElements, construction)
  const baseCount = parentElements.length
    ? topologyParents.length
    : resolveGuideRowCount(guide, parent.options)
  if (parentElements.length && baseCount === 0) return null
  const shapingKind = shapingKindFromIncrement(countIncrement)
  const shaping = shapingKind
    ? createRowShaping(baseCount, shapingKind, Math.abs(countIncrement))
    : undefined
  const targetCount = shaping
    ? targetCountForRowShaping(baseCount, shaping.kind, shaping.count)
    : baseCount
  const radialStep = guide.type === 'radial-grid' ? Math.max(1, guide.ringSpacing) : 40
  const generatedRadialOffset = parent.options.radialOffset + radialStep
  const binding: ParametricRowBinding = {
    id: idFactory(),
    guideId: parent.guideId,
    symbolId: parent.symbolId,
    sequence: parent.sequence,
    construction,
    patternOrder: nextPatternOrder(elements),
    parentRowId: parent.id,
    generatedRadialOffset,
    shaping,
    options: {
      ...parent.options,
      distributionMode: 'count',
      count: targetCount,
      radialOffset: generatedRadialOffset,
    },
  }

  const placements = generateGuideRowPlacements(guide, binding.options)
  const generated = applyBindingSymbols(
    rowPlacementsToElements(
      placements,
      binding.symbolId,
      () => idFactory(),
    ),
    binding,
  )
  const linked = applyRowTopology(generated, topologyParents, shaping)

  return { binding, elements: linked }
}

export function createPatternIncreaseSequence(
  elements: StitchElement[],
  guides: Guide[],
  parent: ParametricRowBinding,
  increaseCount: number,
  steps: number,
  idFactory: ParametricIdFactory,
) {
  let working = [...elements]
  let currentParent = parent
  const createdRows: Array<{ binding: ParametricRowBinding; elements: StitchElement[] }> = []

  for (let index = 0; index < Math.max(0, Math.round(steps)); index += 1) {
    const created = createNextPatternRow(
      working,
      guides,
      currentParent,
      Math.abs(increaseCount),
      idFactory,
    )
    if (!created) break
    createdRows.push(created)
    working = [...working, ...created.elements]
    currentParent = created.binding
  }

  return {
    rows: createdRows,
    elements: createdRows.flatMap((row) => row.elements),
  }
}

export function deleteParametricRow(elements: StitchElement[], rowId: string) {
  if (rowElements(elements, rowId).some((element) => element.locked === true)) return elements
  const withoutDeleted = elements.filter((element) => element.parametricRow?.id !== rowId)
  return withoutDeleted.map((element) => {
    const binding = element.parametricRow
    if (binding?.parentRowId !== rowId) return element
    return {
      ...element,
      parentStitchIds: undefined,
      parametricRow: {
        ...binding,
        parentRowId: undefined,
        generatedRadialOffset: undefined,
        shaping: undefined,
        topologyOverride: undefined,
      },
    }
  })
}

export function detachParametricRow(elements: StitchElement[], rowId: string) {
  return elements.map((element) =>
    element.parametricRow?.id === rowId
      ? { ...element, parametricRow: undefined, parentStitchIds: undefined }
      : element,
  )
}

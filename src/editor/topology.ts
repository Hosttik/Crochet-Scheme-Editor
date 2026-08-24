import type { RowShaping, StitchElement } from '../types'
import { targetCountForRowShaping } from './rowShaping'

export type StitchTopologyLink = {
  childId: string
  parentIds: string[]
}

function changeEndIndices(baseCount: number, changeCount: number) {
  const base = Math.max(1, Math.round(baseCount))
  const changes = Math.max(0, Math.min(base, Math.round(changeCount)))
  if (!changes) return new Set<number>()

  return new Set(
    Array.from({ length: changes }, (_, index) =>
      Math.max(0, Math.min(base - 1, Math.round(((index + 1) * base) / changes) - 1)),
    ),
  )
}

export function buildParentGroups(
  parents: StitchElement[],
  childCount: number,
  shaping?: RowShaping,
): string[][] {
  const targetCount = Math.max(0, Math.round(childCount))
  if (!parents.length || !targetCount) return []

  if (!shaping) {
    if (parents.length !== targetCount) return Array.from({ length: targetCount }, () => [])
    return parents.map((parent) => [parent.id])
  }

  const expected = targetCountForRowShaping(parents.length, shaping.kind, shaping.count)
  if (expected !== targetCount || shaping.baseCount !== parents.length) {
    return Array.from({ length: targetCount }, () => [])
  }

  const changes = changeEndIndices(parents.length, shaping.count)
  const groups: string[][] = []

  if (shaping.kind === 'increase') {
    parents.forEach((parent, index) => {
      groups.push([parent.id])
      if (changes.has(index)) groups.push([parent.id])
    })
    return groups
  }

  let index = 0
  while (index < parents.length) {
    if (index + 1 < parents.length && changes.has(index + 1)) {
      groups.push([parents[index].id, parents[index + 1].id])
      index += 2
    } else {
      groups.push([parents[index].id])
      index += 1
    }
  }
  return groups
}

export function applyRowTopology(
  children: StitchElement[],
  parents: StitchElement[],
  shaping?: RowShaping,
): StitchElement[] {
  const groups = buildParentGroups(parents, children.length, shaping)
  return children.map((child, index) => ({
    ...child,
    parentStitchIds: groups[index]?.length ? groups[index] : undefined,
  }))
}

export function topologyLinks(elements: StitchElement[], rowId?: string): StitchTopologyLink[] {
  return elements
    .filter((element) => !rowId || element.parametricRow?.id === rowId)
    .filter((element) => element.parentStitchIds?.length)
    .map((element) => ({ childId: element.id, parentIds: element.parentStitchIds ?? [] }))
}

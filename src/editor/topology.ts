import type {
  RowShaping,
  RowShapingKind,
  RowTopologyOverride,
  StitchElement,
} from '../types'
import { targetCountForRowShaping } from './rowShaping'

export type StitchTopologyLink = {
  childId: string
  parentIds: string[]
}

export type TopologyChangeMarker = {
  childId: string
  parentId: string
  kind: RowShapingKind
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

export function automaticTopologyOverride(
  parents: StitchElement[],
  shaping?: RowShaping,
): RowTopologyOverride | undefined {
  if (!shaping || shaping.count <= 0 || shaping.baseCount !== parents.length) return undefined
  const indices = [...changeEndIndices(parents.length, shaping.count)]
  return {
    changeParentIds: indices
      .map((index) => parents[index]?.id)
      .filter((id): id is string => Boolean(id)),
  }
}

function overrideIndices(
  parents: StitchElement[],
  shaping: RowShaping,
  override?: RowTopologyOverride,
) {
  const source = override ?? automaticTopologyOverride(parents, shaping)
  if (!source || source.changeParentIds.length !== shaping.count) return null

  const indexById = new Map(parents.map((parent, index) => [parent.id, index]))
  const indices = source.changeParentIds.map((id) => indexById.get(id) ?? -1)
  if (indices.some((index) => index < 0) || new Set(indices).size !== indices.length) return null

  indices.sort((left, right) => left - right)
  if (shaping.kind === 'decrease') {
    if (indices.some((index) => index < 1)) return null
    for (let index = 1; index < indices.length; index += 1) {
      if (indices[index] - indices[index - 1] < 2) return null
    }
  }
  return indices
}

export function isTopologyOverrideValid(
  parents: StitchElement[],
  shaping: RowShaping | undefined,
  override: RowTopologyOverride | undefined,
) {
  if (!override) return true
  if (!shaping || shaping.baseCount !== parents.length) return false
  return overrideIndices(parents, shaping, override) !== null
}

export function buildParentGroups(
  parents: StitchElement[],
  childCount: number,
  shaping?: RowShaping,
  topologyOverride?: RowTopologyOverride,
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

  const resolvedIndices = overrideIndices(parents, shaping, topologyOverride)
  if (!resolvedIndices) return Array.from({ length: targetCount }, () => [])
  const changes = new Set(resolvedIndices)
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
  topologyOverride?: RowTopologyOverride,
): StitchElement[] {
  const groups = buildParentGroups(parents, children.length, shaping, topologyOverride)
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

export function topologyChangeMarkers(
  elements: StitchElement[],
  rowId?: string,
): TopologyChangeMarker[] {
  const rows = new Map<string, StitchElement[]>()
  for (const element of elements) {
    const id = element.parametricRow?.id
    if (!id || (rowId && id !== rowId)) continue
    rows.set(id, [...(rows.get(id) ?? []), element])
  }

  const markers: TopologyChangeMarker[] = []
  for (const children of rows.values()) {
    const shaping = children[0]?.parametricRow?.shaping
    if (!shaping) continue
    children.forEach((child, index) => {
      const parentIds = child.parentStitchIds ?? []
      if (shaping.kind === 'decrease' && parentIds.length === 2) {
        markers.push({ childId: child.id, parentId: parentIds[1], kind: 'decrease' })
        return
      }
      if (shaping.kind === 'increase' && parentIds.length === 1 && index > 0) {
        const previous = children[index - 1]?.parentStitchIds ?? []
        if (previous.length === 1 && previous[0] === parentIds[0]) {
          markers.push({ childId: child.id, parentId: parentIds[0], kind: 'increase' })
        }
      }
    })
  }
  return markers
}

export function shiftTopologyChange(
  parents: StitchElement[],
  shaping: RowShaping,
  topologyOverride: RowTopologyOverride | undefined,
  parentId: string,
  direction: -1 | 1,
): RowTopologyOverride | null {
  const baseOverride = topologyOverride ?? automaticTopologyOverride(parents, shaping)
  if (!baseOverride) return null
  const indexById = new Map(parents.map((parent, index) => [parent.id, index]))
  const currentIndices = overrideIndices(parents, shaping, baseOverride)
  const currentIndex = indexById.get(parentId)
  if (!currentIndices || currentIndex === undefined || !currentIndices.includes(currentIndex)) return null

  const targetIndex = currentIndex + direction
  if (targetIndex < 0 || targetIndex >= parents.length) return null
  if (shaping.kind === 'decrease' && targetIndex < 1) return null

  const others = currentIndices.filter((index) => index !== currentIndex)
  if (others.includes(targetIndex)) return null
  if (shaping.kind === 'decrease' && others.some((index) => Math.abs(index - targetIndex) < 2)) {
    return null
  }

  const nextIndices = [...others, targetIndex].sort((left, right) => left - right)
  return {
    changeParentIds: nextIndices
      .map((index) => parents[index]?.id)
      .filter((id): id is string => Boolean(id)),
  }
}

export function topologyOverrideIsCustom(
  parents: StitchElement[],
  shaping: RowShaping | undefined,
  topologyOverride: RowTopologyOverride | undefined,
) {
  if (!shaping || !topologyOverride) return false
  const automatic = automaticTopologyOverride(parents, shaping)
  if (!automatic) return false
  return automatic.changeParentIds.join('\u0000') !== topologyOverride.changeParentIds.join('\u0000')
}

import type { StitchElement } from '../types'
import { isElementLocked, isElementVisible } from './document'

export type SemanticSelectionOptions = {
  expandGroups?: boolean
  expandRows?: boolean
  visibleSeedsOnly?: boolean
}

/**
 * Resolves authoring-object selection while respecting locks.
 *
 * A normal group or parametric row is atomic: if any member is locked, the
 * semantic object is treated as locked and none of its members are returned.
 * Alt/direct single-stitch actions can opt out of group expansion.
 */
export function semanticSelectionIds(
  elements: StitchElement[],
  seedIds: string[],
  options: SemanticSelectionOptions = {},
) {
  const {
    expandGroups = true,
    expandRows = true,
    visibleSeedsOnly = false,
  } = options
  const byId = new Map(elements.map((element) => [element.id, element]))
  const groups = new Map<string, StitchElement[]>()
  const rows = new Map<string, StitchElement[]>()

  for (const element of elements) {
    if (element.groupId) groups.set(element.groupId, [...(groups.get(element.groupId) ?? []), element])
    const rowId = element.parametricRow?.id
    if (rowId) rows.set(rowId, [...(rows.get(rowId) ?? []), element])
  }

  const result = new Set<string>()
  for (const id of seedIds) {
    const element = byId.get(id)
    if (!element || isElementLocked(element)) continue
    if (visibleSeedsOnly && !isElementVisible(element)) continue

    const rowId = expandRows ? element.parametricRow?.id : undefined
    if (rowId) {
      const members = rows.get(rowId) ?? []
      if (!members.length || members.some(isElementLocked)) continue
      members.forEach((member) => result.add(member.id))
      continue
    }

    if (expandGroups && element.groupId) {
      const members = groups.get(element.groupId) ?? []
      if (!members.length || members.some(isElementLocked)) continue
      members.forEach((member) => result.add(member.id))
      continue
    }

    result.add(element.id)
  }
  return [...result]
}

export function semanticLockIds(elements: StitchElement[], id: string) {
  const element = elements.find((item) => item.id === id)
  if (!element) return []
  if (element.parametricRow) {
    return elements.filter((item) => item.parametricRow?.id === element.parametricRow?.id).map((item) => item.id)
  }
  if (element.groupId) {
    return elements.filter((item) => item.groupId === element.groupId).map((item) => item.id)
  }
  return [id]
}

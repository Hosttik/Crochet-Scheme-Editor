import type { StitchElement } from '../types'

export type RepeatPreviewSelectionKind =
  | 'none'
  | 'single-stitch'
  | 'single-group'
  | 'multiple'

export function repeatPreviewSelectionKind(
  elements: StitchElement[],
  selectedIds: string[],
): RepeatPreviewSelectionKind {
  if (!selectedIds.length) return 'none'

  const selected = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selected.has(element.id))
  if (!selectedElements.length) return 'none'
  if (selectedElements.length === 1) return 'single-stitch'

  const groupId = selectedElements[0]?.groupId
  if (!groupId || selectedElements.some((element) => element.groupId !== groupId)) {
    return 'multiple'
  }

  const groupElements = elements.filter((element) => element.groupId === groupId)
  const containsWholeGroup =
    groupElements.length === selectedElements.length &&
    groupElements.every((element) => selected.has(element.id))

  return containsWholeGroup ? 'single-group' : 'multiple'
}

export function shouldShowRepeatPreview(kind: RepeatPreviewSelectionKind) {
  return kind !== 'none'
}

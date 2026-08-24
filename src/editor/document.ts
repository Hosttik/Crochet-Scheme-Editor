import type { CrochetProject, SnappingSettings, StitchElement } from '../types'
import { parseProject } from './projectSchema'

export function isElementVisible(element: StitchElement) {
  return element.visible !== false
}

export function isElementLocked(element: StitchElement) {
  return element.locked === true
}

export function normalizeElement(element: StitchElement): StitchElement {
  return {
    ...element,
    visible: element.visible !== false,
    locked: element.locked === true,
  }
}

export function normalizeElements(elements: StitchElement[]) {
  return elements.map(normalizeElement)
}

export function normalizeProject(
  project: CrochetProject,
  fallbackSnapping: SnappingSettings,
): CrochetProject {
  return parseProject(project, fallbackSnapping)
}

function selectedSet(ids: string[]) {
  return new Set(ids)
}

export function bringForward(elements: StitchElement[], ids: string[]) {
  const next = [...elements]
  const selected = selectedSet(ids)
  for (let index = next.length - 2; index >= 0; index -= 1) {
    if (selected.has(next[index].id) && !selected.has(next[index + 1].id)) {
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    }
  }
  return next
}

export function sendBackward(elements: StitchElement[], ids: string[]) {
  const next = [...elements]
  const selected = selectedSet(ids)
  for (let index = 1; index < next.length; index += 1) {
    if (selected.has(next[index].id) && !selected.has(next[index - 1].id)) {
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    }
  }
  return next
}

export function bringToFront(elements: StitchElement[], ids: string[]) {
  const selected = selectedSet(ids)
  return [
    ...elements.filter((element) => !selected.has(element.id)),
    ...elements.filter((element) => selected.has(element.id)),
  ]
}

export function sendToBack(elements: StitchElement[], ids: string[]) {
  const selected = selectedSet(ids)
  return [
    ...elements.filter((element) => selected.has(element.id)),
    ...elements.filter((element) => !selected.has(element.id)),
  ]
}

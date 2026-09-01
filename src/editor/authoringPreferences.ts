import type { OrientationMode } from '../types'
import type { GuideRepeatOrientation, RepeatMode } from './productivity'

const STORAGE_KEY = 'crochet-scheme-editor-authoring-preferences-v1'

export type AuthoringPreferences = {
  snapOrientation?: OrientationMode
  copyMode?: RepeatMode
  copyCount?: number
  circularAngleStep?: number
  guideOrientation?: GuideRepeatOrientation
}

const EMPTY: AuthoringPreferences = {}

function isBrowser() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function loadAuthoringPreferences(): AuthoringPreferences {
  if (!isBrowser()) return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as AuthoringPreferences
    return parsed && typeof parsed === 'object' ? parsed : EMPTY
  } catch {
    return EMPTY
  }
}

export function saveAuthoringPreferences(patch: Partial<AuthoringPreferences>) {
  if (!isBrowser()) return
  try {
    const current = loadAuthoringPreferences()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // Preferences are convenience state only; editor authoring must keep working
    // when storage is unavailable or blocked by the browser.
  }
}

export function validCopyCount(value: unknown, fallback = 5) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100
    ? value
    : fallback
}

export function validAngleStep(value: unknown, fallback = 45) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function validRepeatMode(value: unknown): RepeatMode {
  return value === 'linear' || value === 'circular' || value === 'guide' ? value : 'linear'
}

export function validGuideOrientation(value: unknown): GuideRepeatOrientation {
  return value === 'keep' || value === 'tangent' || value === 'radial' ? value : 'tangent'
}

export function validSnapOrientation(value: unknown): OrientationMode | null {
  return value === 'none' || value === 'along' || value === 'perpendicular' ? value : null
}

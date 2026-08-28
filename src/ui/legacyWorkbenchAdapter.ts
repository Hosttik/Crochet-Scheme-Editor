import { type ChainBundleCount } from '../editor/chainBundle'
import { symbolName, type Locale } from '../i18n'
import { SYMBOLS } from '../symbols'
import type { Guide } from '../types'
import { dispatchEditorShortcut } from './legacyCommandBridge'
import type { WorkbenchCommands, WorkbenchTool } from './workbenchTypes'

const LEGACY_LIBRARY_SELECTOR = '.left-sidebar > [data-ui-v2-legacy-library="true"]'
const LEGACY_GUIDE_FALLBACK_ORDER: Guide['type'][] = ['arc', 'line', 'curve', 'parabola', 'grid', 'radial-grid']
const LEGACY_TOOL_FALLBACK_ORDER = ['select', 'pan', 'lasso', 'ruler'] as const

type LegacyToolKind = typeof LEGACY_TOOL_FALLBACK_ORDER[number]

function localizedSymbolTitle(symbolId: string, fallbackName: string, abbreviation: string | undefined, locale: Locale) {
  const label = symbolName(symbolId, fallbackName, locale)
  return abbreviation ? `${label} · ${abbreviation}` : label
}

function symbolIdFromAriaLabel(label: string | null) {
  if (!label) return undefined
  for (const symbol of SYMBOLS) {
    if (
      localizedSymbolTitle(symbol.id, symbol.name, symbol.abbreviation, 'ru') === label ||
      localizedSymbolTitle(symbol.id, symbol.name, symbol.abbreviation, 'en') === label
    ) {
      return symbol.id
    }
  }
  return undefined
}

function guideTypeFromButton(button: HTMLButtonElement, index: number): Guide['type'] | undefined {
  const existing = button.dataset.uiV2GuideType as Guide['type'] | undefined
  if (existing) return existing

  const label = `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
  if (label.includes('парабол') || label.includes('parabola')) return 'parabola'
  if (label.includes('радиал') || label.includes('radial')) return 'radial-grid'
  if (label.includes('прямоуголь') || label.includes('rectangular') || label === 'сетка' || label === 'grid') return 'grid'
  if (label.includes('дуга') || label === 'arc') return 'arc'
  if (label.includes('линия') || label === 'line') return 'line'
  if (label.includes('кривая') || label === 'curve') return 'curve'
  return LEGACY_GUIDE_FALLBACK_ORDER[index]
}

function toolKindFromButton(button: HTMLButtonElement, index: number): LegacyToolKind | undefined {
  const existing = button.dataset.uiV2Tool as LegacyToolKind | undefined
  if (existing) return existing

  const label = `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
  if (label.includes('ладонь') || label.includes('hand')) return 'pan'
  if (label.includes('лассо') || label.includes('lasso')) return 'lasso'
  if (label.includes('линейка') || label.includes('ruler')) return 'ruler'
  if (label.includes('выбор') || label.includes('select')) return 'select'
  return LEGACY_TOOL_FALLBACK_ORDER[index]
}

function chainCountFromButton(button: HTMLButtonElement): ChainBundleCount | undefined {
  const existing = Number(button.dataset.uiV2ChainCount)
  if (existing === 2 || existing === 3 || existing === 4) return existing

  const label = `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`
  const count = Number(label.match(/\b([234])\b/)?.[1])
  return count === 2 || count === 3 || count === 4 ? count : undefined
}

function findLegacyButton(predicate: (button: HTMLButtonElement) => boolean) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.left-sidebar button')).find(predicate) ?? null
}

/**
 * Marks the React-owned legacy controls with stable semantic data attributes
 * before hiding their old selector surface. The adapter is intentionally the
 * only module allowed to know these DOM details during the migration.
 */
export function prepareLegacyWorkbenchDom(sidebar: HTMLElement) {
  const legacyTools = sidebar.querySelector<HTMLElement>(
    ':scope > [data-ui-v2-legacy-tools="true"], :scope > .compact-section:first-of-type',
  )
  if (legacyTools) {
    legacyTools.dataset.uiV2LegacyTools = 'true'
    legacyTools.setAttribute('aria-hidden', 'true')
    legacyTools.querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
      const kind = toolKindFromButton(button, index)
      if (kind) button.dataset.uiV2Tool = kind
      button.classList.remove('tool-button', 'active')
      button.classList.add('legacy-tool-button')
      button.tabIndex = -1
    })
  }

  const legacyGuideAdd = sidebar.querySelector<HTMLElement>(':scope > .guide-section .guide-add-grid')
  if (legacyGuideAdd) {
    legacyGuideAdd.dataset.uiV2LegacyGuideAdd = 'true'
    legacyGuideAdd.classList.add('ui-v2-legacy-guide-add')
    legacyGuideAdd.setAttribute('aria-hidden', 'true')
    legacyGuideAdd.querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
      const type = guideTypeFromButton(button, index)
      if (type) button.dataset.uiV2GuideType = type
      button.tabIndex = -1
    })
  }

  const legacyLibrary = sidebar.querySelector<HTMLElement>(
    ':scope > [data-ui-v2-legacy-library="true"], :scope > .symbols-section:not(.element-library)',
  )
  if (!legacyLibrary) return

  legacyLibrary.dataset.uiV2LegacyLibrary = 'true'
  legacyLibrary.setAttribute('aria-hidden', 'true')
  legacyLibrary.classList.remove('symbols-section')
  legacyLibrary.classList.add('legacy-symbols-section')

  const search = legacyLibrary.querySelector<HTMLInputElement>('[data-testid="symbol-search"], .symbol-search, .legacy-symbol-search')
  if (search) {
    search.removeAttribute('data-testid')
    search.classList.remove('symbol-search')
    search.classList.add('legacy-symbol-search')
    search.tabIndex = -1
  }

  legacyLibrary.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    if (button.classList.contains('chain-bundle-button')) {
      const count = chainCountFromButton(button)
      if (count) button.dataset.uiV2ChainCount = String(count)
    } else {
      const symbolId = button.dataset.uiV2SymbolId ?? symbolIdFromAriaLabel(button.getAttribute('aria-label'))
      if (symbolId) button.dataset.uiV2SymbolId = symbolId
    }

    button.classList.remove('symbol-button', 'chain-bundle-button', 'active')
    button.classList.add('legacy-symbol-button')
    button.tabIndex = -1
  })
}

/**
 * Temporary state reader for the bridge. Behavioral UI components never read
 * the canvas classes themselves; App-owned state can replace this function
 * when the bridge is removed.
 */
export function readLegacyWorkbenchTool(current: WorkbenchTool): WorkbenchTool {
  const canvas = document.querySelector('.editor-canvas')
  if (!canvas) return current
  if (canvas.classList.contains('pan-tool')) return { type: 'pan' }
  if (canvas.classList.contains('lassoing')) return { type: 'lasso' }
  if (canvas.classList.contains('measuring')) return { type: 'ruler' }
  if (!canvas.classList.contains('placing')) return { type: 'select' }
  return current
}

/**
 * Temporary implementation of the semantic workbench command contract.
 * Consumers never query or click legacy DOM directly; replacing any command
 * with an App-owned callback therefore does not require another ToolRail or
 * ElementLibrary refactor.
 */
export function createLegacyWorkbenchCommands(): WorkbenchCommands {
  return {
    select: () => dispatchEditorShortcut('Escape'),
    togglePan: () => dispatchEditorShortcut('h'),
    toggleLasso: () => dispatchEditorShortcut('l'),
    toggleRuler: () => dispatchEditorShortcut('r'),
    addGuide: (type) => {
      findLegacyButton((button) => button.dataset.uiV2GuideType === type)?.click()
    },
    selectSymbol: (symbolId) => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>(`${LEGACY_LIBRARY_SELECTOR} button`))
        .find((candidate) => candidate.dataset.uiV2SymbolId === symbolId)
      button?.click()
    },
    selectChainBundle: (count) => {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>(`${LEGACY_LIBRARY_SELECTOR} button`))
        .find((candidate) => Number(candidate.dataset.uiV2ChainCount) === count)
      button?.click()
    },
  }
}

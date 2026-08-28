import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { type ChainBundleCount } from '../editor/chainBundle'
import { symbolName, type Locale } from '../i18n'
import { SYMBOLS } from '../symbols'
import type { Guide } from '../types'
import { ElementLibrary } from './ElementLibrary'
import { FavoriteQuickBar } from './FavoriteQuickBar'
import {
  loadFavorites,
  saveFavorites,
  type FavoriteElementKey,
} from './favorites'
import { dispatchEditorShortcut } from './legacyCommandBridge'
import { ToolRail } from './ToolRail'
import type { WorkbenchTool } from './workbenchTypes'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'
const LEGACY_LIBRARY_SELECTOR = '.left-sidebar > [data-ui-v2-legacy-library="true"]'
const LEGACY_GUIDE_TYPES: Guide['type'][] = ['arc', 'line', 'curve', 'parabola', 'grid', 'radial-grid']

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

function legacyButtonByAriaLabel(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(`${LEGACY_LIBRARY_SELECTOR} button`))
    .find((button) => button.getAttribute('aria-label') === label) ?? null
}

function legacyGuideButtonByType(type: Guide['type']) {
  return document.querySelector<HTMLButtonElement>(`.left-sidebar > .guide-section button[data-ui-v2-guide-type="${type}"]`)
}

/**
 * Keep the legacy controls mounted as a temporary behavioral adapter, but make
 * their old selector surface private so the extracted UI is the only visible
 * and test-addressable workbench. This intentionally does not observe the
 * sidebar subtree: observing and mutating the same class attributes caused a
 * self-sustaining MutationObserver loop in Chromium.
 */
function sanitizeLegacyLeftControls(sidebar: HTMLElement) {
  const legacyTools = sidebar.querySelector<HTMLElement>(
    ':scope > [data-ui-v2-legacy-tools="true"], :scope > .compact-section:first-of-type',
  )
  if (legacyTools) {
    legacyTools.dataset.uiV2LegacyTools = 'true'
    legacyTools.setAttribute('aria-hidden', 'true')
    legacyTools.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.classList.remove('tool-button', 'active')
      button.classList.add('legacy-tool-button')
      button.tabIndex = -1
    })
  }

  const guideButtons = sidebar.querySelectorAll<HTMLButtonElement>(':scope > .guide-section .guide-add-grid > button')
  guideButtons.forEach((button, index) => {
    const type = LEGACY_GUIDE_TYPES[index]
    if (type) button.dataset.uiV2GuideType = type
  })

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
    button.classList.remove('symbol-button', 'chain-bundle-button', 'active')
    button.classList.add('legacy-symbol-button')
    button.tabIndex = -1
  })
}

function toolFromCanvas(current: WorkbenchTool): WorkbenchTool {
  const canvas = document.querySelector('.editor-canvas')
  if (!canvas) return current
  if (canvas.classList.contains('pan-tool')) return { type: 'pan' }
  if (canvas.classList.contains('lassoing')) return { type: 'lasso' }
  if (canvas.classList.contains('measuring')) return { type: 'ruler' }
  if (!canvas.classList.contains('placing')) return { type: 'select' }
  return current
}

export function LeftWorkbenchBridge() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [quickPortalTarget, setQuickPortalTarget] = useState<HTMLElement | null>(null)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [tool, setTool] = useState<WorkbenchTool>({ type: 'select' })
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<FavoriteElementKey[]>(loadFavorites)

  useEffect(() => saveFavorites(favorites), [favorites])

  useEffect(() => {
    let host: HTMLElement | null = null
    let quickHost: HTMLElement | null = null
    let canvasObserver: MutationObserver | null = null
    let mountObserver: MutationObserver | null = null

    const sync = () => {
      const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
      if (sidebar) sanitizeLegacyLeftControls(sidebar)
      setTool((current) => toolFromCanvas(current))
    }

    const install = () => {
      if (!host) {
        const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
        if (sidebar) {
          sanitizeLegacyLeftControls(sidebar)
          host = document.createElement('div')
          host.className = 'ui-v2-left-bridge-host'
          host.dataset.uiV2Bridge = 'left-workbench'
          sidebar.prepend(host)
          setPortalTarget(host)

          const canvas = document.querySelector('.editor-canvas')
          if (canvas) {
            canvasObserver = new MutationObserver(() => queueMicrotask(sync))
            canvasObserver.observe(canvas, { attributes: true, attributeFilter: ['class'] })
          }
          sync()
        }
      }

      if (!quickHost) {
        const topbarActions = document.querySelector<HTMLElement>('.topbar-actions')
        if (topbarActions) {
          quickHost = document.createElement('div')
          quickHost.className = 'ui-v2-favorites-bridge-host'
          quickHost.dataset.uiV2Bridge = 'favorite-quick-bar'
          topbarActions.prepend(quickHost)
          setQuickPortalTarget(quickHost)
        }
      }

      return Boolean(host && quickHost)
    }

    if (!install()) {
      const root = document.querySelector('.editor-root-v2__workbench') ?? document.body
      mountObserver = new MutationObserver(() => {
        if (install()) {
          mountObserver?.disconnect()
          mountObserver = null
        }
      })
      mountObserver.observe(root, { childList: true, subtree: true })
    }

    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (button?.textContent?.trim() === 'EN') setLocale('en')
      if (button?.textContent?.trim() === 'RU') setLocale('ru')
      queueMicrotask(sync)
    }
    const onKeyUp = () => queueMicrotask(sync)
    document.addEventListener('click', onClick, true)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      mountObserver?.disconnect()
      canvasObserver?.disconnect()
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('keyup', onKeyUp)
      host?.remove()
      quickHost?.remove()
      setPortalTarget(null)
      setQuickPortalTarget(null)
    }
  }, [])

  const symbolTitles = useMemo(() => new Map(SYMBOLS.map((symbol) => {
    const label = symbolName(symbol.id, symbol.name, locale)
    return [symbol.id, symbol.abbreviation ? `${label} · ${symbol.abbreviation}` : label]
  })), [locale])

  if (!portalTarget) return null

  const runShortcut = (key: string) => {
    dispatchEditorShortcut(key)
    queueMicrotask(() => setTool((current) => toolFromCanvas(current)))
  }
  const cancelPlacement = () => {
    setTool({ type: 'select' })
    runShortcut('Escape')
  }
  const selectSymbol = (symbolId: string) => {
    const title = symbolTitles.get(symbolId)
    if (!title) return
    setTool({ type: 'place', symbolId })
    legacyButtonByAriaLabel(title)?.click()
  }
  const selectChainBundle = (count: ChainBundleCount) => {
    const label = locale === 'ru' ? `${count} воздушные петли` : `${count} chains`
    const abbreviation = locale === 'ru' ? `${count} ВП` : `${count} ch`
    setTool({ type: 'place-chain-bundle', count })
    legacyButtonByAriaLabel(`${label} · ${abbreviation}`)?.click()
  }
  const addGuide = (type: Guide['type']) => {
    legacyGuideButtonByType(type)?.click()
    queueMicrotask(() => setTool({ type: 'select' }))
  }
  const toggleFavorite = (key: FavoriteElementKey) => {
    setFavorites((current) => current.includes(key)
      ? current.filter((favorite) => favorite !== key)
      : [...current, key])
  }

  return (
    <>
      {createPortal(
        <>
          <ToolRail
            locale={locale}
            tool={tool}
            onSelect={() => {
              setTool({ type: 'select' })
              runShortcut('Escape')
            }}
            onTogglePan={() => runShortcut('h')}
            onToggleLasso={() => runShortcut('l')}
            onAddGuide={addGuide}
            onToggleRuler={() => runShortcut('r')}
          />
          <ElementLibrary
            locale={locale}
            tool={tool}
            query={query}
            favorites={favorites}
            onQueryChange={setQuery}
            onToggleFavorite={toggleFavorite}
            onSelectSymbol={selectSymbol}
            onSelectChainBundle={selectChainBundle}
            onCancelPlacement={cancelPlacement}
          />
        </>,
        portalTarget,
      )}
      {quickPortalTarget && createPortal(
        <FavoriteQuickBar
          locale={locale}
          tool={tool}
          favorites={favorites}
          onSelectSymbol={selectSymbol}
          onSelectChainBundle={selectChainBundle}
          onCancelPlacement={cancelPlacement}
        />,
        quickPortalTarget,
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CHAIN_BUNDLE_COUNTS, type ChainBundleCount } from '../editor/chainBundle'
import { symbolName, type Locale } from '../i18n'
import { SYMBOLS } from '../symbols'
import { ElementLibrary } from './ElementLibrary'
import { dispatchEditorShortcut } from './legacyCommandBridge'
import { ToolRail } from './ToolRail'
import type { WorkbenchTool } from './workbenchTypes'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'
const LEGACY_LIBRARY_SELECTOR = '.left-sidebar > .legacy-symbols-section'

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

function buttonByAriaLabel(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(`${LEGACY_LIBRARY_SELECTOR} button`))
    .find((button) => button.getAttribute('aria-label') === label) ?? null
}

function sanitizeLegacyLeftControls(sidebar: HTMLElement) {
  const legacyTools = sidebar.querySelector<HTMLElement>(':scope > .compact-section')
  legacyTools?.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const active = button.classList.contains('active')
    button.dataset.legacyActive = active ? 'true' : 'false'
    button.classList.remove('tool-button', 'active')
    button.classList.add('legacy-tool-button')
  })

  const rawLibrary = sidebar.querySelector<HTMLElement>(':scope > .symbols-section:not(.element-library)')
  const legacyLibrary = rawLibrary ?? sidebar.querySelector<HTMLElement>(':scope > .legacy-symbols-section')
  if (!legacyLibrary) return

  if (legacyLibrary.classList.contains('symbols-section')) {
    legacyLibrary.classList.remove('symbols-section')
    legacyLibrary.classList.add('legacy-symbols-section')
  }

  const search = legacyLibrary.querySelector<HTMLInputElement>('[data-testid="symbol-search"], .symbol-search')
  if (search) {
    search.removeAttribute('data-testid')
    search.classList.remove('symbol-search')
    search.classList.add('legacy-symbol-search')
  }

  legacyLibrary.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    const wasSymbol = button.classList.contains('symbol-button') || button.classList.contains('legacy-symbol-button')
    if (!wasSymbol) return

    const isBundle = button.classList.contains('chain-bundle-button') || button.dataset.legacySymbolKind === 'chain-bundle'
    const active = button.classList.contains('active')
    button.dataset.legacySymbolKind = isBundle ? 'chain-bundle' : 'symbol'
    button.dataset.legacyActive = active ? 'true' : 'false'
    button.classList.remove('symbol-button', 'chain-bundle-button', 'active')
    button.classList.add('legacy-symbol-button')
  })
}

function readWorkbenchTool(locale: Locale): WorkbenchTool {
  const canvas = document.querySelector('.editor-canvas')
  if (canvas?.classList.contains('pan-tool')) return { type: 'pan' }
  if (canvas?.classList.contains('lassoing')) return { type: 'lasso' }
  if (canvas?.classList.contains('measuring')) return { type: 'ruler' }

  const activeBundle = document.querySelector<HTMLButtonElement>(
    `${LEGACY_LIBRARY_SELECTOR} [data-legacy-symbol-kind="chain-bundle"][data-legacy-active="true"]`,
  )
  if (activeBundle) {
    const label = activeBundle.getAttribute('aria-label') ?? ''
    const count = Number(label.match(/^\d+/)?.[0])
    if (CHAIN_BUNDLE_COUNTS.includes(count as ChainBundleCount)) {
      return { type: 'place-chain-bundle', count: count as ChainBundleCount }
    }
  }

  const activeSymbol = document.querySelector<HTMLButtonElement>(
    `${LEGACY_LIBRARY_SELECTOR} [data-legacy-symbol-kind="symbol"][data-legacy-active="true"]`,
  )
  if (activeSymbol) {
    const activeLabel = activeSymbol.getAttribute('aria-label')
    const definition = SYMBOLS.find((symbol) => {
      const label = symbolName(symbol.id, symbol.name, locale)
      const title = symbol.abbreviation ? `${label} · ${symbol.abbreviation}` : label
      return title === activeLabel
    })
    if (definition) return { type: 'place', symbolId: definition.id }
  }

  return { type: 'select' }
}

export function LeftWorkbenchBridge() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [tool, setTool] = useState<WorkbenchTool>({ type: 'select' })
  const [query, setQuery] = useState('')

  useEffect(() => {
    let host: HTMLElement | null = null
    let stateObserver: MutationObserver | null = null
    let mountObserver: MutationObserver | null = null

    const sync = () => {
      const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
      if (sidebar) sanitizeLegacyLeftControls(sidebar)
      setTool(readWorkbenchTool(locale))
    }

    const install = () => {
      if (host) return true
      const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
      if (!sidebar) return false

      sanitizeLegacyLeftControls(sidebar)
      host = document.createElement('div')
      host.className = 'ui-v2-left-bridge-host'
      host.dataset.uiV2Bridge = 'left-workbench'
      sidebar.prepend(host)
      setPortalTarget(host)

      stateObserver = new MutationObserver(sync)
      stateObserver.observe(sidebar, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] })
      const canvas = document.querySelector('.editor-canvas')
      if (canvas) stateObserver.observe(canvas, { attributes: true, attributeFilter: ['class'] })
      sync()
      return true
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
    document.addEventListener('click', onClick, true)
    window.addEventListener('keyup', sync)

    return () => {
      mountObserver?.disconnect()
      stateObserver?.disconnect()
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('keyup', sync)
      host?.remove()
      setPortalTarget(null)
    }
  }, [locale])

  useEffect(() => {
    setTool(readWorkbenchTool(locale))
  }, [locale])

  const symbolTitles = useMemo(() => new Map(SYMBOLS.map((symbol) => {
    const label = symbolName(symbol.id, symbol.name, locale)
    return [symbol.id, symbol.abbreviation ? `${label} · ${symbol.abbreviation}` : label]
  })), [locale])

  if (!portalTarget) return null

  const cancelPlacement = () => dispatchEditorShortcut('Escape')
  const selectSymbol = (symbolId: string) => {
    const title = symbolTitles.get(symbolId)
    if (title) buttonByAriaLabel(title)?.click()
  }
  const selectChainBundle = (count: ChainBundleCount) => {
    const label = locale === 'ru' ? `${count} воздушные петли` : `${count} chains`
    const abbreviation = locale === 'ru' ? `${count} ВП` : `${count} ch`
    buttonByAriaLabel(`${label} · ${abbreviation}`)?.click()
  }

  return createPortal(
    <>
      <ToolRail
        locale={locale}
        tool={tool}
        onSelect={() => dispatchEditorShortcut('Escape')}
        onTogglePan={() => dispatchEditorShortcut('h')}
        onToggleLasso={() => dispatchEditorShortcut('l')}
        onToggleRuler={() => dispatchEditorShortcut('r')}
      />
      <ElementLibrary
        locale={locale}
        tool={tool}
        query={query}
        onQueryChange={setQuery}
        onSelectSymbol={selectSymbol}
        onSelectChainBundle={selectChainBundle}
        onCancelPlacement={cancelPlacement}
      />
    </>,
    portalTarget,
  )
}

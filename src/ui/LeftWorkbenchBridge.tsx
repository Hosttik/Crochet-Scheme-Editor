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

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

function buttonByAriaLabel(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.left-sidebar .symbols-section button'))
    .find((button) => button.getAttribute('aria-label') === label) ?? null
}

function readWorkbenchTool(locale: Locale): WorkbenchTool {
  const canvas = document.querySelector('.editor-canvas')
  if (canvas?.classList.contains('pan-tool')) return { type: 'pan' }
  if (canvas?.classList.contains('lassoing')) return { type: 'lasso' }
  if (canvas?.classList.contains('measuring')) return { type: 'ruler' }

  const activeBundle = document.querySelector<HTMLButtonElement>('.left-sidebar .symbols-section .chain-bundle-button.active')
  if (activeBundle) {
    const label = activeBundle.getAttribute('aria-label') ?? ''
    const count = Number(label.match(/^\d+/)?.[0])
    if (CHAIN_BUNDLE_COUNTS.includes(count as ChainBundleCount)) {
      return { type: 'place-chain-bundle', count: count as ChainBundleCount }
    }
  }

  const activeSymbol = document.querySelector<HTMLButtonElement>('.left-sidebar .symbols-section .symbol-button.active:not(.chain-bundle-button)')
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
    const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
    if (!sidebar) return

    const host = document.createElement('div')
    host.className = 'ui-v2-left-bridge-host'
    host.dataset.uiV2Bridge = 'left-workbench'
    sidebar.prepend(host)
    setPortalTarget(host)

    const sync = () => setTool(readWorkbenchTool(locale))
    const observer = new MutationObserver(sync)
    observer.observe(sidebar, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] })
    const canvas = document.querySelector('.editor-canvas')
    if (canvas) observer.observe(canvas, { attributes: true, attributeFilter: ['class'] })

    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (button?.textContent?.trim() === 'EN') setLocale('en')
      if (button?.textContent?.trim() === 'RU') setLocale('ru')
      queueMicrotask(sync)
    }
    document.addEventListener('click', onClick, true)
    window.addEventListener('keyup', sync)
    sync()

    return () => {
      observer.disconnect()
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('keyup', sync)
      host.remove()
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

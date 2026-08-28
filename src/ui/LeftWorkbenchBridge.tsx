import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { type ChainBundleCount } from '../editor/chainBundle'
import { type Locale } from '../i18n'
import type { Guide } from '../types'
import { FavoriteQuickBar } from './FavoriteQuickBar'
import {
  loadFavorites,
  saveFavorites,
  type FavoriteElementKey,
} from './favorites'
import { LeftWorkbenchSurface } from './LeftWorkbenchSurface'
import {
  createLegacyWorkbenchCommands,
  prepareLegacyWorkbenchDom,
  readLegacyWorkbenchTool,
} from './legacyWorkbenchAdapter'
import type { WorkbenchCommands, WorkbenchTool } from './workbenchTypes'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

export type LeftWorkbenchBridgeProps = {
  /**
   * Semantic App-owned commands can replace the temporary adapter one by one.
   * The extracted UI never needs to know which implementation handled them.
   */
  commands?: Partial<WorkbenchCommands>
  /** @deprecated Prefer commands.addGuide while the migration is in progress. */
  onAddGuide?: (type: Guide['type']) => void
}

/**
 * Temporary migration controller. Portal discovery, legacy DOM preparation and
 * legacy state observation live here; the actual ToolRail + ElementLibrary UI
 * is rendered by LeftWorkbenchSurface and contains no legacy knowledge.
 */
export function LeftWorkbenchBridge({ commands, onAddGuide }: LeftWorkbenchBridgeProps = {}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [quickPortalTarget, setQuickPortalTarget] = useState<HTMLElement | null>(null)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [tool, setTool] = useState<WorkbenchTool>({ type: 'select' })
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<FavoriteElementKey[]>(loadFavorites)
  const legacyCommands = useMemo(() => createLegacyWorkbenchCommands(), [])
  const activeCommands = useMemo<WorkbenchCommands>(() => ({
    ...legacyCommands,
    ...commands,
    ...(onAddGuide ? { addGuide: onAddGuide } : {}),
  }), [commands, legacyCommands, onAddGuide])

  useEffect(() => saveFavorites(favorites), [favorites])

  useEffect(() => {
    let host: HTMLElement | null = null
    let quickHost: HTMLElement | null = null
    let canvasObserver: MutationObserver | null = null
    let mountObserver: MutationObserver | null = null

    const sync = () => {
      const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
      if (sidebar) prepareLegacyWorkbenchDom(sidebar)
      setTool((current) => readLegacyWorkbenchTool(current))
    }

    const install = () => {
      if (!host) {
        const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
        if (sidebar) {
          prepareLegacyWorkbenchDom(sidebar)
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

  if (!portalTarget) return null

  const syncToolSoon = () => queueMicrotask(() => setTool((current) => readLegacyWorkbenchTool(current)))
  const runCommand = (command: () => void) => {
    command()
    syncToolSoon()
  }
  const cancelPlacement = () => {
    setTool({ type: 'select' })
    runCommand(activeCommands.select)
  }
  const selectSymbol = (symbolId: string) => {
    setTool({ type: 'place', symbolId })
    runCommand(() => activeCommands.selectSymbol(symbolId))
  }
  const selectChainBundle = (count: ChainBundleCount) => {
    setTool({ type: 'place-chain-bundle', count })
    runCommand(() => activeCommands.selectChainBundle(count))
  }
  const addGuide = (type: Guide['type']) => {
    activeCommands.addGuide(type)
    setTool({ type: 'select' })
    syncToolSoon()
  }
  const toggleFavorite = (key: FavoriteElementKey) => {
    setFavorites((current) => current.includes(key)
      ? current.filter((favorite) => favorite !== key)
      : [...current, key])
  }

  return (
    <>
      {createPortal(
        <LeftWorkbenchSurface
          locale={locale}
          tool={tool}
          query={query}
          favorites={favorites}
          onSelect={() => {
            setTool({ type: 'select' })
            runCommand(activeCommands.select)
          }}
          onTogglePan={() => runCommand(activeCommands.togglePan)}
          onToggleLasso={() => runCommand(activeCommands.toggleLasso)}
          onAddGuide={addGuide}
          onToggleRuler={() => runCommand(activeCommands.toggleRuler)}
          onQueryChange={setQuery}
          onToggleFavorite={toggleFavorite}
          onSelectSymbol={selectSymbol}
          onSelectChainBundle={selectChainBundle}
          onCancelPlacement={cancelPlacement}
        />,
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

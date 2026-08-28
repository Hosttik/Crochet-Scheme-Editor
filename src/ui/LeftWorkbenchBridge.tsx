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
const WORKBENCH_COMMAND_KEYS: Array<keyof WorkbenchCommands> = [
  'select',
  'togglePan',
  'toggleLasso',
  'toggleRuler',
  'addGuide',
  'selectSymbol',
  'selectChainBundle',
]

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

function hasCompleteCommands(commands?: Partial<WorkbenchCommands>): commands is WorkbenchCommands {
  return Boolean(commands && WORKBENCH_COMMAND_KEYS.every((key) => typeof commands[key] === 'function'))
}

export type LeftWorkbenchBridgeProps = {
  /**
   * Semantic App-owned commands can replace the temporary adapter one by one.
   * Supplying the complete command set removes all behavioral command routing
   * through legacy DOM, while the bridge may still hide duplicate legacy JSX
   * until that JSX is physically deleted from App.tsx.
   */
  commands?: Partial<WorkbenchCommands>
  /** App-owned editor tool state. Omitting it keeps the temporary canvas reader. */
  tool?: WorkbenchTool
  /** App-owned locale. Omitting it keeps the temporary language-switch observer. */
  locale?: Locale
  /** @deprecated Prefer commands.addGuide while the migration is in progress. */
  onAddGuide?: (type: Guide['type']) => void
}

/**
 * Temporary migration controller. Portal discovery and duplicate-legacy-DOM
 * preparation live here; the actual ToolRail + ElementLibrary UI is rendered
 * by LeftWorkbenchSurface and contains no legacy knowledge.
 *
 * `commands`, `tool` and `locale` are deliberately controllable so App.tsx can
 * take ownership incrementally. Once the old left JSX is removed, this bridge
 * only needs portal discovery and can then be deleted as the final layout move.
 */
export function LeftWorkbenchBridge({
  commands,
  tool: controlledTool,
  locale: controlledLocale,
  onAddGuide,
}: LeftWorkbenchBridgeProps = {}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [quickPortalTarget, setQuickPortalTarget] = useState<HTMLElement | null>(null)
  const [legacyLocale, setLegacyLocale] = useState<Locale>(initialLocale)
  const [legacyTool, setLegacyTool] = useState<WorkbenchTool>({ type: 'select' })
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<FavoriteElementKey[]>(loadFavorites)

  const locale = controlledLocale ?? legacyLocale
  const tool = controlledTool ?? legacyTool
  const toolControlled = controlledTool !== undefined
  const localeControlled = controlledLocale !== undefined
  const completeCommands = hasCompleteCommands(commands)
  const legacyCommands = useMemo(
    () => completeCommands ? null : createLegacyWorkbenchCommands(),
    [completeCommands],
  )
  const activeCommands = useMemo<WorkbenchCommands>(() => {
    if (completeCommands) return commands
    return {
      ...legacyCommands!,
      ...commands,
      ...(onAddGuide ? { addGuide: onAddGuide } : {}),
    }
  }, [commands, completeCommands, legacyCommands, onAddGuide])

  useEffect(() => saveFavorites(favorites), [favorites])

  useEffect(() => {
    let host: HTMLElement | null = null
    let quickHost: HTMLElement | null = null
    let canvasObserver: MutationObserver | null = null
    let mountObserver: MutationObserver | null = null

    const syncLegacyTool = () => {
      if (toolControlled) return
      setLegacyTool((current) => readLegacyWorkbenchTool(current))
    }

    const prepareSidebar = (sidebar: HTMLElement) => {
      // This remains necessary even with typed commands until App.tsx stops
      // rendering the duplicate legacy controls altogether.
      prepareLegacyWorkbenchDom(sidebar)
    }

    const install = () => {
      if (!host) {
        const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
        if (sidebar) {
          prepareSidebar(sidebar)
          host = document.createElement('div')
          host.className = 'ui-v2-left-bridge-host'
          host.dataset.uiV2Bridge = 'left-workbench'
          sidebar.prepend(host)
          setPortalTarget(host)

          if (!toolControlled) {
            const canvas = document.querySelector('.editor-canvas')
            if (canvas) {
              canvasObserver = new MutationObserver(() => queueMicrotask(syncLegacyTool))
              canvasObserver.observe(canvas, { attributes: true, attributeFilter: ['class'] })
            }
            syncLegacyTool()
          }
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
        const sidebar = document.querySelector<HTMLElement>('.left-sidebar')
        if (sidebar) prepareSidebar(sidebar)
        if (install()) {
          mountObserver?.disconnect()
          mountObserver = null
        }
      })
      mountObserver.observe(root, { childList: true, subtree: true })
    }

    const onClick = (event: MouseEvent) => {
      if (!localeControlled) {
        const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
        if (button?.textContent?.trim() === 'EN') setLegacyLocale('en')
        if (button?.textContent?.trim() === 'RU') setLegacyLocale('ru')
      }
      if (!toolControlled) queueMicrotask(syncLegacyTool)
    }
    const onKeyUp = () => {
      if (!toolControlled) queueMicrotask(syncLegacyTool)
    }
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
  }, [localeControlled, toolControlled])

  if (!portalTarget) return null

  const syncToolSoon = () => {
    if (!toolControlled) {
      queueMicrotask(() => setLegacyTool((current) => readLegacyWorkbenchTool(current)))
    }
  }
  const setOptimisticTool = (next: WorkbenchTool) => {
    if (!toolControlled) setLegacyTool(next)
  }
  const runCommand = (command: () => void) => {
    command()
    syncToolSoon()
  }
  const cancelPlacement = () => {
    setOptimisticTool({ type: 'select' })
    runCommand(activeCommands.select)
  }
  const selectSymbol = (symbolId: string) => {
    setOptimisticTool({ type: 'place', symbolId })
    runCommand(() => activeCommands.selectSymbol(symbolId))
  }
  const selectChainBundle = (count: ChainBundleCount) => {
    setOptimisticTool({ type: 'place-chain-bundle', count })
    runCommand(() => activeCommands.selectChainBundle(count))
  }
  const addGuide = (type: Guide['type']) => {
    activeCommands.addGuide(type)
    setOptimisticTool({ type: 'select' })
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
            setOptimisticTool({ type: 'select' })
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

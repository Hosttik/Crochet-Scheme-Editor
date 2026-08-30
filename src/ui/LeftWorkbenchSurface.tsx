import { useEffect, useState } from 'react'
import type { ChainBundleCount } from '../editor/chainBundle'
import type { Locale } from '../i18n'
import type { Guide } from '../types'
import { ElementLibrary } from './ElementLibrary'
import type { FavoriteElementKey } from './favorites'
import { ToolRail } from './ToolRail'
import { WorkbenchToolShortcuts } from './WorkbenchToolShortcuts'
import { EXPAND_ELEMENT_LIBRARY_EVENT } from './workbenchEvents'
import type { WorkbenchTool } from './workbenchTypes'

const LIBRARY_PANEL_COLLAPSED_STORAGE_KEY = 'crochet-ui-v2-library-panel-collapsed'

function loadLibraryPanelCollapsed() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LIBRARY_PANEL_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export type LeftWorkbenchSurfaceProps = {
  locale: Locale
  tool: WorkbenchTool
  query: string
  favorites: FavoriteElementKey[]
  onSelect: () => void
  onTogglePan: () => void
  onToggleLasso: () => void
  onAddGuide: (type: Guide['type']) => void
  onToggleRuler: () => void
  onQueryChange: (query: string) => void
  onToggleFavorite: (key: FavoriteElementKey) => void
  onSelectSymbol: (symbolId: string) => void
  onSelectChainBundle: (count: ChainBundleCount) => void
  onCancelPlacement: () => void
}

/**
 * Pure UI v2 workbench surface. Editor behavior arrives through semantic
 * callbacks from App; keyboard tool shortcuts are routed through those same
 * callbacks so ToolRail, CanvasToolbar and keyboard cannot diverge.
 */
export function LeftWorkbenchSurface({
  locale,
  tool,
  query,
  favorites,
  onSelect,
  onTogglePan,
  onToggleLasso,
  onAddGuide,
  onToggleRuler,
  onQueryChange,
  onToggleFavorite,
  onSelectSymbol,
  onSelectChainBundle,
  onCancelPlacement,
}: LeftWorkbenchSurfaceProps) {
  const [libraryCollapsed, setLibraryCollapsed] = useState(loadLibraryPanelCollapsed)

  useEffect(() => {
    try {
      window.localStorage.setItem(LIBRARY_PANEL_COLLAPSED_STORAGE_KEY, String(libraryCollapsed))
    } catch {
      // Layout preference is non-critical; keep the editor usable without storage.
    }
  }, [libraryCollapsed])

  useEffect(() => {
    const expandLibrary = () => setLibraryCollapsed(false)
    window.addEventListener(EXPAND_ELEMENT_LIBRARY_EVENT, expandLibrary)
    return () => window.removeEventListener(EXPAND_ELEMENT_LIBRARY_EVENT, expandLibrary)
  }, [])

  return (
    <>
      <WorkbenchToolShortcuts
        onTogglePan={onTogglePan}
        onToggleLasso={onToggleLasso}
        onToggleRuler={onToggleRuler}
      />
      <ToolRail
        locale={locale}
        tool={tool}
        libraryCollapsed={libraryCollapsed}
        onSelect={onSelect}
        onTogglePan={onTogglePan}
        onToggleLasso={onToggleLasso}
        onAddGuide={onAddGuide}
        onToggleRuler={onToggleRuler}
        onToggleLibrary={() => setLibraryCollapsed((value) => !value)}
      />
      <ElementLibrary
        locale={locale}
        tool={tool}
        query={query}
        favorites={favorites}
        collapsed={libraryCollapsed}
        onQueryChange={onQueryChange}
        onToggleFavorite={onToggleFavorite}
        onSelectSymbol={onSelectSymbol}
        onSelectChainBundle={onSelectChainBundle}
        onCancelPlacement={onCancelPlacement}
        onCollapse={() => setLibraryCollapsed(true)}
      />
    </>
  )
}

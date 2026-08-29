import type { ChainBundleCount } from '../editor/chainBundle'
import type { Locale } from '../i18n'
import type { Guide } from '../types'
import { ElementLibrary } from './ElementLibrary'
import type { FavoriteElementKey } from './favorites'
import { ToolRail } from './ToolRail'
import { WorkbenchToolShortcuts } from './WorkbenchToolShortcuts'
import type { WorkbenchTool } from './workbenchTypes'

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
        onSelect={onSelect}
        onTogglePan={onTogglePan}
        onToggleLasso={onToggleLasso}
        onAddGuide={onAddGuide}
        onToggleRuler={onToggleRuler}
      />
      <ElementLibrary
        locale={locale}
        tool={tool}
        query={query}
        favorites={favorites}
        onQueryChange={onQueryChange}
        onToggleFavorite={onToggleFavorite}
        onSelectSymbol={onSelectSymbol}
        onSelectChainBundle={onSelectChainBundle}
        onCancelPlacement={onCancelPlacement}
      />
    </>
  )
}

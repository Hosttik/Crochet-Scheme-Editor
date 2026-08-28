import type { ChainBundleCount } from '../editor/chainBundle'
import type { Locale } from '../i18n'
import type { Guide } from '../types'
import { ElementLibrary } from './ElementLibrary'
import type { FavoriteElementKey } from './favorites'
import { ToolRail } from './ToolRail'
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
 * Pure UI v2 workbench surface. It has no knowledge of portals, legacy DOM,
 * keyboard synthesis or editor internals; all editor behavior arrives through
 * semantic callbacks. Once App owns the workbench layout directly this
 * component can be rendered in place and LeftWorkbenchBridge can disappear.
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

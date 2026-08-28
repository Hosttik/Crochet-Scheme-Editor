import type { ChainBundleCount } from '../editor/chainBundle'
import type { Guide } from '../types'

export type WorkbenchTool =
  | { type: 'select' }
  | { type: 'pan' }
  | { type: 'lasso' }
  | { type: 'ruler' }
  | { type: 'place'; symbolId: string }
  | { type: 'place-chain-bundle'; count: ChainBundleCount }
  | { type: 'row-marker' }

/**
 * Semantic command boundary between the extracted UI v2 workbench and the
 * editor state owner. The workbench must speak in editor concepts rather than
 * DOM selectors, translated labels or synthetic click targets.
 *
 * The current migration can provide these commands from the legacy adapter one
 * by one, then replace them with App-owned callbacks without changing ToolRail
 * or ElementLibrary again.
 */
export type WorkbenchCommands = {
  select: () => void
  togglePan: () => void
  toggleLasso: () => void
  toggleRuler: () => void
  addGuide: (type: Guide['type']) => void
  selectSymbol: (symbolId: string) => void
  selectChainBundle: (count: ChainBundleCount) => void
}

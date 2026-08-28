import type { ChainBundleCount } from '../editor/chainBundle'

export type WorkbenchTool =
  | { type: 'select' }
  | { type: 'pan' }
  | { type: 'lasso' }
  | { type: 'ruler' }
  | { type: 'place'; symbolId: string }
  | { type: 'place-chain-bundle'; count: ChainBundleCount }
  | { type: 'row-marker' }

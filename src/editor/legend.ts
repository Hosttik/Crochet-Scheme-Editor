import type { StitchElement } from '../types'
import { SYMBOLS } from '../symbols'

export function usedLegendItems(elements: StitchElement[]) {
  const used = new Set(
    elements
      .filter((element) => element.visible !== false)
      .map((element) => element.symbolId),
  )
  return SYMBOLS.filter((symbol) => used.has(symbol.id))
}

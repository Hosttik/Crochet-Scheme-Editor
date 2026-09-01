const STEM_COUNTS: Record<string, number> = {
  'single-2-in-1': 2,
  'single-3-in-1': 3,
  'half-double-2-in-1': 2,
  'half-double-3-in-1': 3,
  'double-2-in-1': 2,
  'double-3-in-1': 3,
  'double-4-in-1': 4,
  'double-5-shell': 5,
}

export function semanticStemCount(symbolId: string) {
  return STEM_COUNTS[symbolId] ?? null
}

export function semanticBaseStemSpacing(symbolId: string) {
  const count = semanticStemCount(symbolId)
  if (!count || count < 2) return null
  const spread = Math.max(18, (count - 1) * 9)
  return spread / (count - 1)
}

export function semanticStemSpacing(symbolId: string, spreadFactor = 1) {
  const base = semanticBaseStemSpacing(symbolId)
  return base == null ? null : base * spreadFactor
}

export function spreadForSemanticStemSpacing(symbolId: string, spacing: number) {
  const base = semanticBaseStemSpacing(symbolId)
  if (base == null) return 1
  return spacing / base
}

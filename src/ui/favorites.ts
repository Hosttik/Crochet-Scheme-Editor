import { CHAIN_BUNDLE_COUNTS, type ChainBundleCount } from '../editor/chainBundle'
import { SYMBOL_BY_ID } from '../symbols'

export type FavoriteElementKey = `symbol:${string}` | `chain:${ChainBundleCount}`

export type ResolvedFavorite =
  | { key: FavoriteElementKey; kind: 'symbol'; symbolId: string }
  | { key: FavoriteElementKey; kind: 'chain'; count: ChainBundleCount }

const STORAGE_KEY = 'crochet-scheme-editor-ui-favorites-v1'

export function symbolFavoriteKey(symbolId: string): FavoriteElementKey {
  return `symbol:${symbolId}`
}

export function chainFavoriteKey(count: ChainBundleCount): FavoriteElementKey {
  return `chain:${count}`
}

export function resolveFavorite(value: unknown): ResolvedFavorite | null {
  if (typeof value !== 'string') return null

  if (value.startsWith('symbol:')) {
    const symbolId = value.slice('symbol:'.length)
    return SYMBOL_BY_ID.has(symbolId)
      ? { key: value as FavoriteElementKey, kind: 'symbol', symbolId }
      : null
  }

  if (!value.startsWith('chain:')) return null
  const count = Number(value.slice('chain:'.length)) as ChainBundleCount
  return CHAIN_BUNDLE_COUNTS.includes(count)
    ? { key: value as FavoriteElementKey, kind: 'chain', count }
    : null
}

export function resolveFavorites(values: readonly unknown[]): ResolvedFavorite[] {
  const resolved: ResolvedFavorite[] = []
  const seen = new Set<FavoriteElementKey>()

  for (const value of values) {
    const item = resolveFavorite(value)
    if (!item || seen.has(item.key)) continue
    seen.add(item.key)
    resolved.push(item)
  }

  return resolved
}

export function isFavoriteElementKey(value: unknown): value is FavoriteElementKey {
  return resolveFavorite(value) !== null
}

export function loadFavorites(): FavoriteElementKey[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return resolveFavorites(raw).map((item) => item.key)
  } catch {
    return []
  }
}

export function saveFavorites(favorites: readonly FavoriteElementKey[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(resolveFavorites(favorites).map((item) => item.key)),
    )
  } catch {
    // UI preferences are non-critical and remain usable for the current session.
  }
}

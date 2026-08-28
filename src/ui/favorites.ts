import type { ChainBundleCount } from '../editor/chainBundle'

export type FavoriteElementKey = `symbol:${string}` | `chain:${ChainBundleCount}`

const STORAGE_KEY = 'crochet-scheme-editor-ui-favorites-v1'

export function symbolFavoriteKey(symbolId: string): FavoriteElementKey {
  return `symbol:${symbolId}`
}

export function chainFavoriteKey(count: ChainBundleCount): FavoriteElementKey {
  return `chain:${count}`
}

export function loadFavorites(): FavoriteElementKey[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw.filter((value): value is FavoriteElementKey =>
      typeof value === 'string' && (value.startsWith('symbol:') || /^chain:[234]$/.test(value)),
    )
  } catch {
    return []
  }
}

export function saveFavorites(favorites: readonly FavoriteElementKey[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

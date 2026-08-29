import { CHAIN_BUNDLE_COUNTS, type ChainBundleCount } from '../editor/chainBundle'
import { SYMBOL_BY_ID } from '../symbols'

export type FavoriteElementKey = `symbol:${string}` | `chain:${ChainBundleCount}`

const STORAGE_KEY = 'crochet-scheme-editor-ui-favorites-v1'

export function symbolFavoriteKey(symbolId: string): FavoriteElementKey {
  return `symbol:${symbolId}`
}

export function chainFavoriteKey(count: ChainBundleCount): FavoriteElementKey {
  return `chain:${count}`
}

function validFavoriteKey(value: unknown): value is FavoriteElementKey {
  if (typeof value !== 'string') return false
  if (value.startsWith('symbol:')) return SYMBOL_BY_ID.has(value.slice('symbol:'.length))
  if (!value.startsWith('chain:')) return false
  const count = Number(value.slice('chain:'.length))
  return CHAIN_BUNDLE_COUNTS.includes(count as ChainBundleCount)
}

export function loadFavorites(): FavoriteElementKey[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.filter(validFavoriteKey))]
  } catch {
    return []
  }
}

export function saveFavorites(favorites: readonly FavoriteElementKey[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(favorites.filter(validFavoriteKey))]))
  } catch {
    // UI preferences are non-critical and remain usable for the current session.
  }
}

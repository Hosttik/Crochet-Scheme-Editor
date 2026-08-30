import { describe, expect, it } from 'vitest'
import {
  chainFavoriteKey,
  isFavoriteElementKey,
  resolveFavorite,
  resolveFavorites,
  symbolFavoriteKey,
} from './favorites'

describe('favorite key resolution', () => {
  it('resolves supported symbol and chain keys into one typed representation', () => {
    expect(resolveFavorite(symbolFavoriteKey('single'))).toEqual({
      key: 'symbol:single',
      kind: 'symbol',
      symbolId: 'single',
    })
    expect(resolveFavorite(chainFavoriteKey(3))).toEqual({
      key: 'chain:3',
      kind: 'chain',
      count: 3,
    })
  })

  it('rejects malformed and unsupported keys consistently', () => {
    for (const value of [null, 3, 'symbol:not-real', 'chain:8', 'other:single']) {
      expect(resolveFavorite(value)).toBeNull()
      expect(isFavoriteElementKey(value)).toBe(false)
    }
  })

  it('deduplicates while preserving favorite order', () => {
    expect(resolveFavorites([
      'symbol:single',
      'chain:2',
      'symbol:single',
      'chain:4',
      'chain:9',
    ]).map((item) => item.key)).toEqual([
      'symbol:single',
      'chain:2',
      'chain:4',
    ])
  })
})

import type {
  RowConstruction,
  RowConstructionMode,
  RowWorkDirection,
} from '../types'
import type { Locale } from '../i18n'

const COPY = {
  ru: {
    spiral: 'по спирали',
    joined: 'замкнутый круг',
    turning: 'поворотный ряд',
    startChain: 'ВП подъёма',
    outsideCount: 'вне счёта ряда',
    join: 'замкнуть СС',
    turn: 'повернуть работу',
  },
  en: {
    spiral: 'continuous spiral',
    joined: 'joined round',
    turning: 'turning row',
    startChain: 'starting CH',
    outsideCount: 'not counted in row total',
    join: 'join with SL ST',
    turn: 'turn work',
  },
} as const

function clampStartChains(value: number) {
  return Math.max(0, Math.min(10, Math.round(Number.isFinite(value) ? value : 0)))
}

export function defaultRowConstruction(
  mode: RowConstructionMode,
  direction: RowWorkDirection = 'along',
): RowConstruction {
  if (mode === 'spiral') {
    return { mode, direction, startChainCount: 0, joinWithSlipStitch: false }
  }
  if (mode === 'joined') {
    return { mode, direction, startChainCount: 1, joinWithSlipStitch: true }
  }
  return { mode, direction, startChainCount: 1, joinWithSlipStitch: false }
}

export function normalizeRowConstruction(
  construction?: RowConstruction,
): RowConstruction | undefined {
  if (!construction) return undefined
  const direction: RowWorkDirection = construction.direction === 'reverse' ? 'reverse' : 'along'
  const startChainCount = clampStartChains(construction.startChainCount)
  if (construction.mode === 'spiral') {
    return {
      mode: 'spiral',
      direction,
      startChainCount: 0,
      joinWithSlipStitch: false,
    }
  }
  if (construction.mode === 'joined') {
    return {
      mode: 'joined',
      direction,
      startChainCount,
      joinWithSlipStitch: construction.joinWithSlipStitch !== false,
    }
  }
  return {
    mode: 'turning',
    direction,
    startChainCount,
    joinWithSlipStitch: false,
  }
}

export function nextRowConstruction(construction?: RowConstruction) {
  const normalized = normalizeRowConstruction(construction)
  if (!normalized) return undefined
  if (normalized.mode !== 'turning') return { ...normalized }
  return {
    ...normalized,
    direction: normalized.direction === 'along' ? 'reverse' as const : 'along' as const,
  }
}

export function rowConstructionDirectionSymbol(construction?: RowConstruction) {
  const normalized = normalizeRowConstruction(construction)
  if (!normalized) return ''
  if (normalized.mode === 'turning') return normalized.direction === 'along' ? '→' : '←'
  return normalized.direction === 'along' ? '↻' : '↺'
}

export function rowConstructionLabel(construction: RowConstruction, locale: Locale) {
  const normalized = normalizeRowConstruction(construction)!
  return COPY[locale][normalized.mode]
}

export function rowConstructionInstructionParts(
  construction: RowConstruction | undefined,
  locale: Locale,
) {
  const normalized = normalizeRowConstruction(construction)
  if (!normalized) return { prefix: [] as string[], suffix: [] as string[] }
  const copy = COPY[locale]
  const prefix: string[] = []
  const suffix: string[] = []

  if (normalized.startChainCount > 0) {
    prefix.push(
      `${normalized.startChainCount} ${copy.startChain} (${copy.outsideCount})`,
    )
  }

  if (normalized.mode === 'spiral') {
    suffix.push(`${copy.spiral} ${rowConstructionDirectionSymbol(normalized)}`)
  } else if (normalized.mode === 'joined') {
    suffix.push(`${copy.joined} ${rowConstructionDirectionSymbol(normalized)}`)
    if (normalized.joinWithSlipStitch) suffix.push(copy.join)
  } else {
    suffix.push(`${copy.turning} ${rowConstructionDirectionSymbol(normalized)}`)
    suffix.push(copy.turn)
  }

  return { prefix, suffix }
}

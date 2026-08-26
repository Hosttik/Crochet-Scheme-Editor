import type {
  RowConstruction,
  RowConstructionMode,
  RowJoinTarget,
  RowWorkDirection,
  StitchElement,
} from '../types'
import type { Locale } from '../i18n'

export type NormalizedRowConstruction = RowConstruction & {
  startChainCountsAsStitch: boolean
  skipFirstStitches: number
  joinTarget: RowJoinTarget
}

const COPY = {
  ru: {
    spiral: 'по спирали',
    joined: 'замкнутый круг',
    turning: 'поворотный ряд',
    startChain: 'ВП подъёма',
    outsideCount: 'вне счёта ряда',
    countedStart: 'считаются первой петлёй ряда',
    skipOne: 'пропустить 1 петлю основания',
    skipMany: (count: number) => `пропустить ${count} петель основания`,
    joinFirst: 'замкнуть СС в первую провязанную петлю',
    joinChain: 'замкнуть СС в верхнюю ВП подъёма',
    turn: 'повернуть работу',
  },
  en: {
    spiral: 'continuous spiral',
    joined: 'joined round',
    turning: 'turning row',
    startChain: 'starting CH',
    outsideCount: 'not counted in row total',
    countedStart: 'counts as the first stitch of the row',
    skipOne: 'skip 1 base stitch',
    skipMany: (count: number) => `skip ${count} base stitches`,
    joinFirst: 'join with SL ST in the first worked stitch',
    joinChain: 'join with SL ST in the top of the starting CH',
    turn: 'turn work',
  },
} as const

function clampStartChains(value: number) {
  return Math.max(0, Math.min(10, Math.round(Number.isFinite(value) ? value : 0)))
}

function clampSkippedStitches(value: number | undefined) {
  return Math.max(0, Math.min(10, Math.round(Number.isFinite(value) ? value! : 0)))
}

export function defaultRowConstruction(
  mode: RowConstructionMode,
  direction: RowWorkDirection = 'along',
): NormalizedRowConstruction {
  if (mode === 'spiral') {
    return {
      mode,
      direction,
      startChainCount: 0,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: false,
      joinTarget: 'first-stitch',
    }
  }
  if (mode === 'joined') {
    return {
      mode,
      direction,
      startChainCount: 1,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: true,
      joinTarget: 'first-stitch',
    }
  }
  return {
    mode,
    direction,
    startChainCount: 1,
    startChainCountsAsStitch: false,
    skipFirstStitches: 0,
    joinWithSlipStitch: false,
    joinTarget: 'first-stitch',
  }
}

export function normalizeRowConstruction(
  construction?: RowConstruction,
): NormalizedRowConstruction | undefined {
  if (!construction) return undefined
  const direction: RowWorkDirection = construction.direction === 'reverse' ? 'reverse' : 'along'
  const startChainCount = clampStartChains(construction.startChainCount)
  const startChainCountsAsStitch = startChainCount > 0 && construction.startChainCountsAsStitch === true
  const skipFirstStitches = clampSkippedStitches(construction.skipFirstStitches)

  if (construction.mode === 'spiral') {
    return {
      mode: 'spiral',
      direction,
      startChainCount: 0,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: false,
      joinTarget: 'first-stitch',
    }
  }

  if (construction.mode === 'joined') {
    const joinWithSlipStitch = construction.joinWithSlipStitch !== false
    const requestedJoinTarget: RowJoinTarget = construction.joinTarget === 'start-chain-top'
      ? 'start-chain-top'
      : 'first-stitch'
    return {
      mode: 'joined',
      direction,
      startChainCount,
      startChainCountsAsStitch,
      skipFirstStitches,
      joinWithSlipStitch,
      joinTarget: joinWithSlipStitch && startChainCount > 0
        ? requestedJoinTarget
        : 'first-stitch',
    }
  }

  return {
    mode: 'turning',
    direction,
    startChainCount,
    startChainCountsAsStitch,
    skipFirstStitches,
    joinWithSlipStitch: false,
    joinTarget: 'first-stitch',
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

export function rowConstructionTopologyParents(
  parents: StitchElement[],
  construction?: RowConstruction,
) {
  const normalized = normalizeRowConstruction(construction)
  if (!normalized) return parents
  const ordered = normalized.direction === 'reverse' ? [...parents].reverse() : parents
  return normalized.skipFirstStitches > 0
    ? ordered.slice(normalized.skipFirstStitches)
    : ordered
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

/**
 * Starting chains remain boundary metadata rather than ordinary topology nodes.
 * When they count, the whole starting-chain boundary contributes one logical stitch
 * to the written row total regardless of the number of chain links used for height.
 */
export function rowConstructionBoundaryCount(construction?: RowConstruction) {
  const normalized = normalizeRowConstruction(construction)
  return normalized?.startChainCountsAsStitch ? 1 : 0
}

export function rowConstructionRowTotal(
  workedStitchCount: number,
  construction?: RowConstruction,
) {
  const worked = Math.max(0, Math.round(Number.isFinite(workedStitchCount) ? workedStitchCount : 0))
  return worked + rowConstructionBoundaryCount(construction)
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
      `${normalized.startChainCount} ${copy.startChain} (${normalized.startChainCountsAsStitch ? copy.countedStart : copy.outsideCount})`,
    )
  }

  if (normalized.skipFirstStitches > 0) {
    prefix.push(
      normalized.skipFirstStitches === 1
        ? copy.skipOne
        : copy.skipMany(normalized.skipFirstStitches),
    )
  }

  if (normalized.mode === 'spiral') {
    suffix.push(`${copy.spiral} ${rowConstructionDirectionSymbol(normalized)}`)
  } else if (normalized.mode === 'joined') {
    suffix.push(`${copy.joined} ${rowConstructionDirectionSymbol(normalized)}`)
    if (normalized.joinWithSlipStitch) {
      suffix.push(normalized.joinTarget === 'start-chain-top' ? copy.joinChain : copy.joinFirst)
    }
  } else {
    suffix.push(`${copy.turning} ${rowConstructionDirectionSymbol(normalized)}`)
    suffix.push(copy.turn)
  }

  return { prefix, suffix }
}

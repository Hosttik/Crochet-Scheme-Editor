import type { Point, StitchElement } from '../types'

export type ChainBundleCount = 2 | 3 | 4

export const CHAIN_BUNDLE_COUNTS: readonly ChainBundleCount[] = [2, 3, 4]
export const CHAIN_BUNDLE_SPACING = 22

function radians(degrees: number) {
  return degrees * Math.PI / 180
}

export function chainBundleLayout(
  center: Point,
  count: ChainBundleCount,
  rotation = 0,
  spacing = CHAIN_BUNDLE_SPACING,
): Point[] {
  const angle = radians(rotation)
  const axis = { x: Math.cos(angle), y: Math.sin(angle) }
  const middle = (count - 1) / 2
  return Array.from({ length: count }, (_, index) => {
    const offset = (index - middle) * spacing
    return {
      x: center.x + axis.x * offset,
      y: center.y + axis.y * offset,
    }
  })
}

export function createChainBundle(
  center: Point,
  count: ChainBundleCount,
  rotation: number,
  createId: () => string,
): StitchElement[] {
  const groupId = createId()
  return chainBundleLayout(center, count, rotation).map((point) => ({
    id: createId(),
    symbolId: 'chain',
    x: point.x,
    y: point.y,
    rotation,
    visible: true,
    locked: false,
    groupId,
  }))
}

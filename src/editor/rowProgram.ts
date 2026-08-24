import type {
  RowProgram,
  RowProgramGroup,
  RowProgramItem,
  RowProgramLeaf,
  StitchElement,
} from '../types'

const MAX_COUNT = 500
const MAX_REPEAT = 100

export type CompiledRowProgram = {
  valid: boolean
  consumedParents: number
  producedChildren: number
  symbolIds: string[]
  parentGroups: string[][]
  reason?: 'missing-parent' | 'parent-count-mismatch' | 'empty-program'
}

function clampCount(value: number, max = MAX_COUNT) {
  return Math.max(1, Math.min(max, Math.round(value)))
}

export function normalizeRowProgramLeaf(leaf: RowProgramLeaf): RowProgramLeaf | null {
  const symbolId = leaf.symbolId.trim()
  if (!symbolId) return null
  return {
    kind: leaf.kind,
    symbolId,
    count: clampCount(leaf.count),
  }
}

function normalizeGroup(group: RowProgramGroup): RowProgramGroup | null {
  const items = group.items
    .map(normalizeRowProgramLeaf)
    .filter((item): item is RowProgramLeaf => Boolean(item))
  if (!items.length) return null
  return {
    kind: 'group',
    repeat: clampCount(group.repeat, MAX_REPEAT),
    items,
  }
}

export function normalizeRowProgram(program?: RowProgram): RowProgram | undefined {
  if (!program) return undefined
  const items = program.items
    .map((item): RowProgramItem | null => item.kind === 'group'
      ? normalizeGroup(item)
      : normalizeRowProgramLeaf(item))
    .filter((item): item is RowProgramItem => Boolean(item))
  if (!items.length) return undefined
  return {
    repeat: clampCount(program.repeat, MAX_REPEAT),
    items,
  }
}

export function rowProgramHasTopologyOperations(program?: RowProgram) {
  const normalized = normalizeRowProgram(program)
  if (!normalized) return false
  return normalized.items.some((item) => item.kind === 'group'
    ? item.items.some((leaf) => leaf.kind !== 'stitch')
    : item.kind !== 'stitch')
}

export function rowProgramLeaves(program?: RowProgram): RowProgramLeaf[] {
  const normalized = normalizeRowProgram(program)
  if (!normalized) return []
  const root: RowProgramLeaf[] = []
  for (let rootRepeat = 0; rootRepeat < normalized.repeat; rootRepeat += 1) {
    for (const item of normalized.items) {
      if (item.kind === 'group') {
        for (let repeat = 0; repeat < item.repeat; repeat += 1) {
          root.push(...item.items)
        }
      } else {
        root.push(item)
      }
    }
  }
  return root
}

export function rowProgramMetrics(program?: RowProgram) {
  let consumedParents = 0
  let producedChildren = 0
  for (const leaf of rowProgramLeaves(program)) {
    if (leaf.kind === 'stitch') {
      consumedParents += leaf.count
      producedChildren += leaf.count
    } else if (leaf.kind === 'increase') {
      consumedParents += leaf.count
      producedChildren += leaf.count * 2
    } else {
      consumedParents += leaf.count * 2
      producedChildren += leaf.count
    }
  }
  return { consumedParents, producedChildren }
}

export function rowProgramSymbolIds(program?: RowProgram) {
  const symbols: string[] = []
  for (const leaf of rowProgramLeaves(program)) {
    const producedPerOperation = leaf.kind === 'increase' ? 2 : 1
    for (let index = 0; index < leaf.count * producedPerOperation; index += 1) {
      symbols.push(leaf.symbolId)
    }
  }
  return symbols
}

function appendLeaf(
  leaf: RowProgramLeaf,
  parents: StitchElement[] | undefined,
  state: { parentIndex: number; parentGroups: string[][] },
) {
  for (let index = 0; index < leaf.count; index += 1) {
    if (leaf.kind === 'stitch') {
      if (parents) {
        const id = parents[state.parentIndex]?.id
        state.parentGroups.push(id ? [id] : [])
      }
      state.parentIndex += 1
      continue
    }
    if (leaf.kind === 'increase') {
      if (parents) {
        const id = parents[state.parentIndex]?.id
        const group = id ? [id] : []
        state.parentGroups.push(group, group)
      }
      state.parentIndex += 1
      continue
    }
    if (parents) {
      const first = parents[state.parentIndex]?.id
      const second = parents[state.parentIndex + 1]?.id
      state.parentGroups.push([first, second].filter((id): id is string => Boolean(id)))
    }
    state.parentIndex += 2
  }
}

export function compileRowProgram(
  program: RowProgram | undefined,
  parents?: StitchElement[],
): CompiledRowProgram {
  const normalized = normalizeRowProgram(program)
  if (!normalized) {
    return {
      valid: false,
      consumedParents: 0,
      producedChildren: 0,
      symbolIds: [],
      parentGroups: [],
      reason: 'empty-program',
    }
  }

  const metrics = rowProgramMetrics(normalized)
  const symbolIds = rowProgramSymbolIds(normalized)
  const requiresParents = rowProgramHasTopologyOperations(normalized)
  if (requiresParents && !parents?.length) {
    return {
      valid: false,
      ...metrics,
      symbolIds,
      parentGroups: [],
      reason: 'missing-parent',
    }
  }
  if (parents && metrics.consumedParents !== parents.length) {
    return {
      valid: false,
      ...metrics,
      symbolIds,
      parentGroups: [],
      reason: 'parent-count-mismatch',
    }
  }

  const state = { parentIndex: 0, parentGroups: [] as string[][] }
  for (const leaf of rowProgramLeaves(normalized)) appendLeaf(leaf, parents, state)
  return {
    valid: true,
    ...metrics,
    symbolIds,
    parentGroups: state.parentGroups,
  }
}

export function applyCompiledProgram(
  children: StitchElement[],
  compiled: CompiledRowProgram,
) {
  if (compiled.producedChildren !== children.length) return children
  return children.map((child, index) => ({
    ...child,
    symbolId: compiled.symbolIds[index] ?? child.symbolId,
    parentStitchIds: compiled.valid && compiled.parentGroups[index]?.length
      ? compiled.parentGroups[index]
      : undefined,
  }))
}

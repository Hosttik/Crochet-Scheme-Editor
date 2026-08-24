export type HistoryState<T> = {
  past: T[]
  future: T[]
}

export type HistoryStep<T> = {
  history: HistoryState<T>
  value: T
}

const DEFAULT_LIMIT = 100

export function emptyHistory<T>(): HistoryState<T> {
  return { past: [], future: [] }
}

export function pushHistory<T>(
  history: HistoryState<T>,
  before: T,
  limit = DEFAULT_LIMIT,
): HistoryState<T> {
  return {
    past: [...history.past, before].slice(-limit),
    future: [],
  }
}

export function undoHistory<T>(
  history: HistoryState<T>,
  current: T,
  limit = DEFAULT_LIMIT,
): HistoryStep<T> | null {
  const previous = history.past.at(-1)
  if (previous === undefined) return null
  return {
    value: previous,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, limit),
    },
  }
}

export function redoHistory<T>(
  history: HistoryState<T>,
  current: T,
  limit = DEFAULT_LIMIT,
): HistoryStep<T> | null {
  const next = history.future[0]
  if (next === undefined) return null
  return {
    value: next,
    history: {
      past: [...history.past, current].slice(-limit),
      future: history.future.slice(1),
    },
  }
}

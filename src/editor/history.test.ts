import { describe, expect, it } from 'vitest'
import { emptyHistory, pushHistory, redoHistory, undoHistory } from './history'

describe('history', () => {
  it('pushes snapshots and clears redo', () => {
    const history = pushHistory({ past: [1], future: [3] }, 2)
    expect(history).toEqual({ past: [1, 2], future: [] })
  })

  it('undoes and redoes without mutating the snapshots', () => {
    const history = pushHistory(pushHistory(emptyHistory<number>(), 1), 2)
    const undone = undoHistory(history, 3)
    expect(undone).toEqual({ value: 2, history: { past: [1], future: [3] } })
    const redone = redoHistory(undone!.history, undone!.value)
    expect(redone).toEqual({ value: 3, history: { past: [1, 2], future: [] } })
  })

  it('keeps only the configured history limit', () => {
    let history = emptyHistory<number>()
    for (let value = 0; value < 5; value += 1) history = pushHistory(history, value, 3)
    expect(history.past).toEqual([2, 3, 4])
  })
})

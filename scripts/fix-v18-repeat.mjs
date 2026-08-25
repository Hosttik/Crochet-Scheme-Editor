import fs from 'node:fs'

const path = 'src/App.tsx'
let source = fs.readFileSync(path, 'utf8')

function replaceOnce(before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: fragment not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: fragment not unique`)
  source = source.slice(0, first) + after + source.slice(first + before.length)
}

replaceOnce(
`  const duplicateSelection = useCallback(() => {
    const duplicateIds = new Set(expandIdsToGroups(elements, unlockedSelectedIds()))
    if (!duplicateIds.size) return
    const source = elements.filter((element) => duplicateIds.has(element.id))
    if (!source.length) return

    const series = duplicateSeriesRef.current
    const isSeries = Boolean(
      series &&
      series.currentIds.length === source.length &&
      series.currentIds.every((id) => duplicateIds.has(id)),
    )
    let duplicated: StitchElement[] = []
    let previousForNext = source.map((element) => ({ ...element }))

    if (series && isSeries) {
      const current = series.currentIds
        .map((id) => elements.find((element) => element.id === id))
        .filter((element): element is StitchElement => Boolean(element))
      if (current.length === series.previous.length) {
        duplicated = cloneWithRepeatedDelta(series.previous, current, createId)
        previousForNext = current.map((element) => ({ ...element }))
      }
    }

    if (!duplicated.length) {
      duplicated = cloneSelectionWithOffset(
        elements,
        [...duplicateIds],
        DUPLICATE_OFFSET,
        DUPLICATE_OFFSET,
        createId,
      )
    }`,
`  const duplicateSelection = useCallback(() => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return

    const series = duplicateSeriesRef.current
    const repeatSeries = Boolean(
      series &&
      selected.size === series.currentIds.length &&
      series.currentIds.every((id) => selected.has(id)),
    )
    let duplicated: StitchElement[] = []
    let previousForNext: StitchElement[] = []

    if (series && repeatSeries) {
      const current = series.currentIds
        .map((id) => elements.find((element) => element.id === id))
        .filter((element): element is StitchElement => Boolean(element))
      if (current.length === series.previous.length) {
        duplicated = cloneWithRepeatedDelta(series.previous, current, createId)
        previousForNext = current.map((element) => ({ ...element }))
      }
    }

    if (!duplicated.length) {
      const duplicateIds = new Set(expandIdsToGroups(elements, [...selected]))
      if (!duplicateIds.size) return
      const current = elements.filter((element) => duplicateIds.has(element.id))
      if (!current.length) return
      previousForNext = current.map((element) => ({ ...element }))
      duplicated = cloneSelectionWithOffset(
        elements,
        [...duplicateIds],
        DUPLICATE_OFFSET,
        DUPLICATE_OFFSET,
        createId,
      )
    }`,
'repeat-last-transform selection precedence',
)

replaceOnce(
`        } else if (key === 'd') {
          event.preventDefault()
          duplicateSelection()
        } else if (key === 'a') {`,
`        } else if (key === 'd') {
          event.preventDefault()
          if (!event.repeat) duplicateSelection()
        } else if (key === 'a') {`,
'ignore repeated Ctrl+D keydown',
)

fs.writeFileSync(path, source)
console.log('v1.8 repeat-last-transform fix applied')

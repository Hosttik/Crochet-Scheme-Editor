import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

type Props = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel?: string
  commitOnBlur?: boolean
}

const DEFERRED_COMMIT_MS = 300

function clampOptional(value: number, min?: number, max?: number) {
  let result = value
  if (min != null) result = Math.max(min, result)
  if (max != null) result = Math.min(max, result)
  return result
}

export function DraftNumberInput({ value, onChange, min, max, step = 1, ariaLabel, commitOnBlur = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const commitTimerRef = useRef<number | null>(null)
  const cancelNextBlurRef = useRef(false)
  const [draft, setDraft] = useState(String(value))

  const clearDeferredCommit = () => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
  }

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(value))
  }, [value])

  useEffect(() => () => clearDeferredCommit(), [])

  const normalizedDraft = (source: string) => {
    if (source.trim() === '') return null
    const parsed = Number(source)
    if (!Number.isFinite(parsed)) return null
    if (min != null && parsed < min) return null
    if (max != null && parsed > max) return null
    return clampOptional(parsed, min, max)
  }

  const commit = () => {
    clearDeferredCommit()
    if (cancelNextBlurRef.current) {
      cancelNextBlurRef.current = false
      return
    }
    const next = normalizedDraft(draft)
    if (next === null) {
      setDraft(String(value))
      return
    }
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  const scheduleDeferredCommit = (nextDraft: string) => {
    clearDeferredCommit()
    if (!commitOnBlur) return
    const next = normalizedDraft(nextDraft)
    if (next === null || next === value) return
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null
      onChange(next)
    }, DEFERRED_COMMIT_MS)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      return
    }
    if (event.key === 'Escape') {
      clearDeferredCommit()
      cancelNextBlurRef.current = true
      setDraft(String(value))
      event.currentTarget.blur()
    }
  }

  return (
    <input
      ref={inputRef}
      type="number"
      aria-label={ariaLabel}
      value={draft}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const nextDraft = event.target.value
        setDraft(nextDraft)
        const next = normalizedDraft(nextDraft)
        if (next === null) {
          clearDeferredCommit()
          return
        }
        if (commitOnBlur) scheduleDeferredCommit(nextDraft)
        else if (next !== value) onChange(next)
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}

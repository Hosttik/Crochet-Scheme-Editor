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

function clampOptional(value: number, min?: number, max?: number) {
  let result = value
  if (min != null) result = Math.max(min, result)
  if (max != null) result = Math.min(max, result)
  return result
}

export function DraftNumberInput({ value, onChange, min, max, step = 1, ariaLabel, commitOnBlur = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }
    const next = clampOptional(parsed, min, max)
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
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
        if (nextDraft.trim() === '') return
        const parsed = Number(nextDraft)
        if (!Number.isFinite(parsed)) return
        if (min != null && parsed < min) return
        if (max != null && parsed > max) return
        if (!commitOnBlur && parsed !== value) onChange(parsed)
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}

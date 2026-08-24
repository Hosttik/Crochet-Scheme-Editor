import { useMemo, useState } from 'react'
import type { Locale } from '../i18n'
import type { StitchElement } from '../types'
import {
  generatePatternInstructions,
  patternInstructionsMarkdown,
  patternInstructionsText,
} from './patternInstructions'
import './patternInstructions.css'

const COPY = {
  ru: {
    title: 'Текстовая инструкция',
    empty: 'Создайте параметрические ряды — инструкция появится автоматически.',
    copy: 'Копировать',
    copied: 'Скопировано',
    txt: 'TXT',
    markdown: 'Markdown',
    rows: 'рядов',
    hint: 'Текст генерируется из структуры рядов и обновляется автоматически при изменении схемы.',
  },
  en: {
    title: 'Written pattern',
    empty: 'Create parametric rows and the written pattern will appear automatically.',
    copy: 'Copy',
    copied: 'Copied',
    txt: 'TXT',
    markdown: 'Markdown',
    rows: 'rows',
    hint: 'Instructions are derived from row structure and update automatically when the pattern changes.',
  },
} as const

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function PatternInstructionsPanel({
  elements,
  locale,
  selectedRowId,
  onSelectRow,
}: {
  elements: StitchElement[]
  locale: Locale
  selectedRowId: string | null
  onSelectRow: (rowId: string) => void
}) {
  const copy = COPY[locale]
  const [copied, setCopied] = useState(false)
  const instructions = useMemo(
    () => generatePatternInstructions(elements, locale),
    [elements, locale],
  )
  const text = useMemo(() => patternInstructionsText(elements, locale), [elements, locale])
  const markdown = useMemo(
    () => patternInstructionsMarkdown(elements, locale),
    [elements, locale],
  )

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="pattern-instructions-panel">
      <div className="pattern-instructions-heading">
        <strong>{copy.title}</strong>
        <span>{instructions.length} {copy.rows}</span>
      </div>

      {!instructions.length ? (
        <p className="pattern-instructions-empty">{copy.empty}</p>
      ) : (
        <>
          <div className="pattern-instructions-list">
            {instructions.map((instruction) => (
              <button
                key={instruction.rowId}
                className={instruction.rowId === selectedRowId ? 'active' : ''}
                onClick={() => onSelectRow(instruction.rowId)}
                title={instruction.text}
              >
                {instruction.text}
              </button>
            ))}
          </div>

          <div className="pattern-instructions-actions">
            <button onClick={() => void copyToClipboard()}>{copied ? copy.copied : copy.copy}</button>
            <button
              onClick={() => downloadText(
                `crochet-pattern-${locale}.txt`,
                text,
                'text/plain;charset=utf-8',
              )}
            >
              {copy.txt}
            </button>
            <button
              onClick={() => downloadText(
                `crochet-pattern-${locale}.md`,
                markdown,
                'text/markdown;charset=utf-8',
              )}
            >
              {copy.markdown}
            </button>
          </div>
        </>
      )}

      <p className="pattern-instructions-hint">{copy.hint}</p>
    </section>
  )
}

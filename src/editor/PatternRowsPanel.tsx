import { SYMBOL_BY_ID } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type { StitchElement } from '../types'
import { patternRows } from './parametricRows'
import './patternRows.css'

const COPY = {
  ru: {
    title: 'Ряды',
    empty: 'Параметрические ряды появятся здесь после создания по направляющей.',
    row: 'Ряд',
    stitches: 'элементов',
    from: 'из ряда',
    next: 'Следующий ряд',
    same: '+0',
    plus6: '+6',
    plus12: '+12',
    hint: 'Кнопки создают следующий ряд наружу от выбранного и увеличивают количество элементов.',
  },
  en: {
    title: 'Rows',
    empty: 'Parametric rows will appear here after you create them from a guide.',
    row: 'Row',
    stitches: 'stitches',
    from: 'from row',
    next: 'Next row',
    same: '+0',
    plus6: '+6',
    plus12: '+12',
    hint: 'Buttons create the next row outward from the selected row and increase its stitch count.',
  },
} as const

export function PatternRowsPanel({
  elements,
  locale,
  selectedRowId,
  onSelect,
  onCreateNext,
}: {
  elements: StitchElement[]
  locale: Locale
  selectedRowId: string | null
  onSelect: (rowId: string) => void
  onCreateNext: (rowId: string, countIncrement: number) => void
}) {
  const copy = COPY[locale]
  const rows = patternRows(elements)
  const rowNumberById = new Map(rows.map((row) => [row.id, row.displayOrder]))

  return (
    <section className="pattern-rows-panel">
      <div className="pattern-rows-heading">
        <strong>{copy.title}</strong>
        <span>{rows.length}</span>
      </div>

      {!rows.length ? (
        <p className="pattern-rows-empty">{copy.empty}</p>
      ) : (
        <>
          <div className="pattern-rows-list">
            {rows.map((row) => {
              const definition = SYMBOL_BY_ID.get(row.binding.symbolId)
              const parentNumber = row.binding.parentRowId
                ? rowNumberById.get(row.binding.parentRowId)
                : undefined
              const active = row.id === selectedRowId

              return (
                <div key={row.id} className={`pattern-row-card ${active ? 'active' : ''}`}>
                  <button className="pattern-row-main" onClick={() => onSelect(row.id)}>
                    <span className="pattern-row-number">{copy.row} {row.displayOrder}</span>
                    <strong>{symbolName(row.binding.symbolId, definition?.name ?? row.binding.symbolId, locale)}</strong>
                    <small>
                      {row.stitchCount} {copy.stitches}
                      {parentNumber ? ` · ${copy.from} ${parentNumber}` : ''}
                    </small>
                  </button>

                  {active && (
                    <div className="pattern-row-next-actions">
                      <span>{copy.next}</span>
                      <div>
                        <button onClick={() => onCreateNext(row.id, 0)}>{copy.same}</button>
                        <button onClick={() => onCreateNext(row.id, 6)}>{copy.plus6}</button>
                        <button onClick={() => onCreateNext(row.id, 12)}>{copy.plus12}</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="pattern-rows-hint">{copy.hint}</p>
        </>
      )}
    </section>
  )
}

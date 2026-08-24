import { SYMBOL_BY_ID } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type { StitchElement } from '../types'
import { PatternInstructionsPanel } from './PatternInstructionsPanel'
import { patternRows } from './parametricRows'
import { rowHasMixedSequence, rowSequenceCycleInfo } from './rowSequence'
import { maxRowShapingChanges } from './rowShaping'
import './patternRows.css'

const COPY = {
  ru: {
    title: 'Ряды',
    empty: 'Параметрические ряды появятся здесь после создания по направляющей.',
    row: 'Ряд',
    stitches: 'элементов',
    from: 'из ряда',
    increases: 'прибавок',
    decreases: 'убавок',
    mixed: 'Смешанный раппорт',
    rapport: 'раппорт',
    next: 'Следующий ряд',
    same: 'Без изменений',
    plus6: '+6 прибавок',
    minus6: '−6 убавок',
    sequence: 'Серия +6 ×4',
    hint: 'Следующий ряд наследует состав/раппорт. Прибавки и убавки меняют topology, но не типы stitches внутри раппорта.',
  },
  en: {
    title: 'Rows',
    empty: 'Parametric rows will appear here after you create them from a guide.',
    row: 'Row',
    stitches: 'stitches',
    from: 'from row',
    increases: 'increases',
    decreases: 'decreases',
    mixed: 'Mixed rapport',
    rapport: 'rapport',
    next: 'Next row',
    same: 'No shaping',
    plus6: '+6 increases',
    minus6: '−6 decreases',
    sequence: '+6 ×4 sequence',
    hint: 'The next row inherits its stitch composition/rapport. Shaping changes topology without replacing rapport stitch types.',
  },
} as const

export function PatternRowsPanel({
  elements,
  locale,
  selectedRowId,
  onSelect,
  onCreateNext,
  onCreateSequence,
}: {
  elements: StitchElement[]
  locale: Locale
  selectedRowId: string | null
  onSelect: (rowId: string) => void
  onCreateNext: (rowId: string, countIncrement: number) => void
  onCreateSequence: (rowId: string) => void
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
              const shaping = row.binding.shaping
              const mixed = rowHasMixedSequence(row.binding)
              const cycle = rowSequenceCycleInfo(row.binding.sequence, row.stitchCount)
              const canIncrease6 = maxRowShapingChanges(row.stitchCount, 'increase') >= 6
              const canDecrease6 = maxRowShapingChanges(row.stitchCount, 'decrease') >= 6

              return (
                <div key={row.id} className={`pattern-row-card ${active ? 'active' : ''}`}>
                  <button className="pattern-row-main" onClick={() => onSelect(row.id)}>
                    <span className="pattern-row-number">{copy.row} {row.displayOrder}</span>
                    <strong>
                      {mixed
                        ? copy.mixed
                        : symbolName(row.binding.symbolId, definition?.name ?? row.binding.symbolId, locale)}
                    </strong>
                    <small>
                      {row.stitchCount} {copy.stitches}
                      {mixed ? ` · ${copy.rapport} ${cycle.templateLength}` : ''}
                      {parentNumber ? ` · ${copy.from} ${parentNumber}` : ''}
                    </small>
                    {shaping && (
                      <span className={`pattern-row-shaping ${shaping.kind}`}>
                        {shaping.count} {shaping.kind === 'increase' ? copy.increases : copy.decreases}
                      </span>
                    )}
                  </button>

                  {active && (
                    <div className="pattern-row-next-actions">
                      <span>{copy.next}</span>
                      <div className="pattern-row-shaping-actions">
                        <button onClick={() => onCreateNext(row.id, 0)}>{copy.same}</button>
                        <button
                          onClick={() => onCreateNext(row.id, 6)}
                          disabled={!canIncrease6}
                        >
                          {copy.plus6}
                        </button>
                        <button
                          onClick={() => onCreateNext(row.id, -6)}
                          disabled={!canDecrease6}
                        >
                          {copy.minus6}
                        </button>
                        <button
                          className="pattern-sequence-button"
                          onClick={() => onCreateSequence(row.id)}
                          disabled={!canIncrease6}
                        >
                          {copy.sequence}
                        </button>
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

      <PatternInstructionsPanel
        elements={elements}
        locale={locale}
        selectedRowId={selectedRowId}
        onSelectRow={onSelect}
      />
    </section>
  )
}

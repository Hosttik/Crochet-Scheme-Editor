import { STITCH_SYMBOLS } from '../symbols'
import { symbolName, type Locale } from '../i18n'
import type {
  ParametricRowBinding,
  RowProgram,
  RowProgramItem,
  RowProgramLeaf,
} from '../types'
import {
  normalizeRowProgram,
  rowProgramHasTopologyOperations,
  rowProgramMetrics,
} from './rowProgram'
import './richRapport.css'

const COPY = {
  ru: {
    rootRepeat: 'Повтор всего раппорта',
    operation: 'Операция', stitch: 'Обычная', increase: 'Прибавка 1→2', decrease: 'Убавка 2→1',
    count: 'Кол-во', symbol: 'Элемент', group: 'Группа', groupRepeat: 'Повтор группы',
    addStep: '+ Шаг', addGroup: '+ Группа', addNested: '+ Шаг в группу', remove: 'Удалить', up: 'Выше', down: 'Ниже',
    parents: 'Родителей потреблено', children: 'Детей создано', valid: 'Топология согласована с предыдущим рядом',
    mismatch: 'Программа должна потреблять ровно все петли предыдущего ряда',
    firstRow: 'Прибавки/убавки требуют предыдущий ряд. В первом ряду используйте только обычные шаги.',
    tooMany: 'Программа создаёт больше 500 элементов. Уменьшите количество или repeat.',
  },
  en: {
    rootRepeat: 'Repeat entire rapport', operation: 'Operation', stitch: 'Normal 1→1', increase: 'Increase 1→2', decrease: 'Decrease 2→1',
    count: 'Count', symbol: 'Stitch', group: 'Group', groupRepeat: 'Group repeat', addStep: '+ Step', addGroup: '+ Group',
    addNested: '+ Step in group', remove: 'Remove', up: 'Move up', down: 'Move down', parents: 'Parents consumed', children: 'Children produced',
    valid: 'Topology matches the previous row', mismatch: 'The program must consume every stitch of the previous row exactly once',
    firstRow: 'Increases/decreases require a previous row. Use normal steps only in the first row.',
    tooMany: 'The program produces more than 500 stitches. Reduce counts or repeats.',
  },
} as const

function defaultLeaf(symbolId: string): RowProgramLeaf { return { kind: 'stitch', symbolId, count: 1 } }
function clamp(value: number, max: number) { return Math.max(1, Math.min(max, Math.round(value) || 1)) }
export function defaultRichProgram(symbolId: string, parentCount?: number): RowProgram {
  return { repeat: 1, items: [{ kind: 'stitch', symbolId, count: Math.max(1, parentCount ?? 6) }] }
}

export function RichRapportEditor({ binding, locale, parentStitchCount, onChange }: {
  binding: ParametricRowBinding; locale: Locale; parentStitchCount?: number; onChange: (binding: ParametricRowBinding) => void
}) {
  const copy = COPY[locale]
  const program = normalizeRowProgram(binding.program)
  if (!program) return null
  const metrics = rowProgramMetrics(program)
  const hasTopologyOperations = rowProgramHasTopologyOperations(program)
  const withinLimit = metrics.producedChildren <= 500 && metrics.consumedParents <= 500
  const parentCompatible = parentStitchCount !== undefined ? metrics.consumedParents === parentStitchCount : !hasTopologyOperations
  const valid = withinLimit && parentCompatible

  const commit = (nextProgram: RowProgram) => {
    const normalized = normalizeRowProgram(nextProgram)
    if (!normalized) return
    const nextMetrics = rowProgramMetrics(normalized)
    if (nextMetrics.producedChildren > 500 || nextMetrics.consumedParents > 500) return
    onChange({
      ...binding, sequence: undefined, shaping: undefined, topologyOverride: undefined, program: normalized,
      options: { ...binding.options, distributionMode: 'count', count: Math.max(1, nextMetrics.producedChildren) },
    })
  }

  const setItems = (items: RowProgramItem[]) => commit({ ...program, items })
  const patchItem = (index: number, item: RowProgramItem) => setItems(program.items.map((current, currentIndex) => currentIndex === index ? item : current))
  const moveItem = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= program.items.length) return
    const items = [...program.items]
    ;[items[index], items[target]] = [items[target], items[index]]
    setItems(items)
  }

  const leafEditor = (leaf: RowProgramLeaf, patch: (leaf: RowProgramLeaf) => void, key: string) => (
    <div className="rich-rapport-leaf" key={key}>
      <label><span>{copy.operation}</span><select value={leaf.kind} onChange={(event) => patch({ ...leaf, kind: event.target.value as RowProgramLeaf['kind'] })}>
        <option value="stitch">{copy.stitch}</option><option value="increase">{copy.increase}</option><option value="decrease">{copy.decrease}</option>
      </select></label>
      <label className="rich-count-field"><span>{copy.count}</span><input type="number" min="1" max="500" value={leaf.count} onChange={(event) => patch({ ...leaf, count: clamp(Number(event.target.value), 500) })} /></label>
      <label><span>{copy.symbol}</span><select value={leaf.symbolId} onChange={(event) => patch({ ...leaf, symbolId: event.target.value })}>
        {STITCH_SYMBOLS.map((symbol) => <option key={symbol.id} value={symbol.id}>{symbolName(symbol.id, symbol.name, locale)}</option>)}
      </select></label>
    </div>
  )

  return <div className="rich-rapport-editor">
    <label className="rich-root-repeat"><span>{copy.rootRepeat}</span><input type="number" min="1" max="100" value={program.repeat} onChange={(event) => commit({ ...program, repeat: clamp(Number(event.target.value), 100) })} /></label>
    <div className="rich-rapport-items">{program.items.map((item, index) => <div className={`rich-rapport-item ${item.kind === 'group' ? 'group' : ''}`} key={`${index}:${item.kind}`}>
      {item.kind === 'group' ? <>
        <div className="rich-group-heading"><strong>{copy.group}</strong><label><span>{copy.groupRepeat}</span><input type="number" min="1" max="100" value={item.repeat} onChange={(event) => patchItem(index, { ...item, repeat: clamp(Number(event.target.value), 100) })} /></label></div>
        <div className="rich-group-leaves">{item.items.map((leaf, leafIndex) => <div className="rich-group-leaf-row" key={`${leafIndex}:${leaf.kind}:${leaf.symbolId}`}>
          {leafEditor(leaf, (nextLeaf) => patchItem(index, { ...item, items: item.items.map((current, currentIndex) => currentIndex === leafIndex ? nextLeaf : current) }), `leaf-${leafIndex}`)}
          <button aria-label={copy.remove} title={copy.remove} disabled={item.items.length <= 1} onClick={() => patchItem(index, { ...item, items: item.items.filter((_, currentIndex) => currentIndex !== leafIndex) })}>×</button>
        </div>)}
          <button className="ghost-button" onClick={() => patchItem(index, { ...item, items: [...item.items, defaultLeaf(binding.symbolId)] })}>{copy.addNested}</button>
        </div>
      </> : leafEditor(item, (nextLeaf) => patchItem(index, nextLeaf), `item-${index}`)}
      <div className="rich-item-actions"><button aria-label={copy.up} title={copy.up} disabled={index === 0} onClick={() => moveItem(index, -1)}>↑</button><button aria-label={copy.down} title={copy.down} disabled={index === program.items.length - 1} onClick={() => moveItem(index, 1)}>↓</button><button aria-label={copy.remove} title={copy.remove} disabled={program.items.length <= 1} onClick={() => setItems(program.items.filter((_, currentIndex) => currentIndex !== index))}>×</button></div>
    </div>)}</div>
    <div className="rich-add-actions"><button className="ghost-button" onClick={() => setItems([...program.items, defaultLeaf(binding.symbolId)])}>{copy.addStep}</button><button className="ghost-button" onClick={() => setItems([...program.items, { kind: 'group', repeat: 2, items: [defaultLeaf(binding.symbolId)] }])}>{copy.addGroup}</button></div>
    <div className={`rich-program-metrics ${valid ? 'valid' : 'invalid'}`}><span>{copy.parents}: <strong>{metrics.consumedParents}</strong>{parentStitchCount !== undefined ? ` / ${parentStitchCount}` : ''}</span><span>{copy.children}: <strong>{metrics.producedChildren}</strong></span></div>
    <p className={`row-generator-hint rich-program-status ${valid ? 'valid' : 'invalid'}`}>{valid ? copy.valid : !withinLimit ? copy.tooMany : parentStitchCount === undefined ? copy.firstRow : copy.mismatch}</p>
  </div>
}
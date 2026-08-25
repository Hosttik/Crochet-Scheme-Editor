import type { Locale } from '../i18n'
import { SYMBOLS } from '../symbols'
import type { StitchElement, Viewport } from '../types'
import { selectionAabb } from './selection'
import './selectionQuickToolbar.css'

const SYMBOL_SIZES = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, { width: symbol.width, height: symbol.height }]),
)

const COPY = {
  ru: {
    duplicate: 'Дублировать',
    group: 'Группировать',
    ungroup: 'Разгруппировать',
    mirrorHorizontal: 'Отразить по горизонтали',
    mirrorVertical: 'Отразить по вертикали',
    rotateLeft: 'Повернуть −15°',
    rotateRight: 'Повернуть +15°',
    delete: 'Удалить',
  },
  en: {
    duplicate: 'Duplicate',
    group: 'Group',
    ungroup: 'Ungroup',
    mirrorHorizontal: 'Mirror horizontally',
    mirrorVertical: 'Mirror vertically',
    rotateLeft: 'Rotate −15°',
    rotateRight: 'Rotate +15°',
    delete: 'Delete',
  },
} as const

export function SelectionQuickToolbar({
  locale,
  elements,
  selectedIds,
  viewport,
  canGroup,
  canUngroup,
  onDuplicate,
  onGroup,
  onUngroup,
  onMirror,
  onRotate,
  onDelete,
}: {
  locale: Locale
  elements: StitchElement[]
  selectedIds: string[]
  viewport: Viewport
  canGroup: boolean
  canUngroup: boolean
  onDuplicate: () => void
  onGroup: () => void
  onUngroup: () => void
  onMirror: (axis: 'left-right' | 'top-bottom') => void
  onRotate: (delta: number) => void
  onDelete: () => void
}) {
  if (!selectedIds.length) return null
  const bounds = selectionAabb(elements, selectedIds, SYMBOL_SIZES)
  if (!bounds) return null
  const copy = COPY[locale]
  const centerX = (bounds.left + bounds.right) / 2
  const left = viewport.panX + centerX * viewport.zoom
  const top = viewport.panY + bounds.top * viewport.zoom

  return (
    <div
      className="selection-quick-toolbar"
      style={{ left, top }}
      role="toolbar"
      aria-label={locale === 'ru' ? 'Быстрые действия с выделением' : 'Selection quick actions'}
    >
      <button title={copy.duplicate} aria-label={copy.duplicate} onClick={onDuplicate}>⧉</button>
      {canUngroup ? (
        <button title={copy.ungroup} aria-label={copy.ungroup} onClick={onUngroup}>U</button>
      ) : (
        <button title={copy.group} aria-label={copy.group} disabled={!canGroup} onClick={onGroup}>G</button>
      )}
      <span className="selection-quick-separator" />
      <button title={copy.mirrorHorizontal} aria-label={copy.mirrorHorizontal} onClick={() => onMirror('left-right')}>↔</button>
      <button title={copy.mirrorVertical} aria-label={copy.mirrorVertical} onClick={() => onMirror('top-bottom')}>↕</button>
      <button title={copy.rotateLeft} aria-label={copy.rotateLeft} onClick={() => onRotate(-15)}>↺</button>
      <button title={copy.rotateRight} aria-label={copy.rotateRight} onClick={() => onRotate(15)}>↻</button>
      <span className="selection-quick-separator" />
      <button className="selection-quick-danger" title={copy.delete} aria-label={copy.delete} onClick={onDelete}>×</button>
    </div>
  )
}

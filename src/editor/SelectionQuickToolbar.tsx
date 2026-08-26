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
    flipLeftRight: 'Отразить слева ↔ справа — вертикальная ось через центр выделения',
    flipTopBottom: 'Отразить сверху ↕ вниз — горизонтальная ось через центр выделения',
    mirrorCopyLeftRight: 'Создать зеркальную копию справа',
    mirrorCopyTopBottom: 'Создать зеркальную копию снизу',
    rotateLeft: 'Повернуть −15°',
    rotateRight: 'Повернуть +15°',
    rotate180: 'Повернуть на 180°',
    delete: 'Удалить',
  },
  en: {
    duplicate: 'Duplicate',
    group: 'Group',
    ungroup: 'Ungroup',
    flipLeftRight: 'Flip left ↔ right — vertical axis through selection center',
    flipTopBottom: 'Flip top ↕ bottom — horizontal axis through selection center',
    mirrorCopyLeftRight: 'Create mirrored copy to the right',
    mirrorCopyTopBottom: 'Create mirrored copy below',
    rotateLeft: 'Rotate −15°',
    rotateRight: 'Rotate +15°',
    rotate180: 'Rotate 180°',
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
  onMirrorCopy,
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
  onMirrorCopy: (axis: 'left-right' | 'top-bottom') => void
  onRotate: (delta: number) => void
  onDelete: () => void
}) {
  if (!selectedIds.length) return null
  const bounds = selectionAabb(elements, selectedIds, SYMBOL_SIZES)
  if (!bounds) return null
  const copy = COPY[locale]
  const centerX = (bounds.left + bounds.right) / 2
  const left = viewport.panX + centerX * viewport.zoom
  const selectionTop = viewport.panY + bounds.top * viewport.zoom
  const selectionBottom = viewport.panY + bounds.bottom * viewport.zoom
  let highestInteractiveY = selectionTop

  if (selectedIds.length === 1) {
    const element = elements.find((item) => item.id === selectedIds[0])
    const definition = element ? SYMBOL_SIZES[element.symbolId] : undefined
    const directRotation = element && definition && element.locked !== true && !element.parametricRow && (
      !element.guideAttachment || element.guideAttachment.orientation === 'keep'
    )
    if (directRotation && element) {
      const handleLocalY = -definition.height / 2 - 30
      const radians = (element.rotation * Math.PI) / 180
      const handleDocumentY = element.y + handleLocalY * Math.cos(radians)
      const handleScreenY = viewport.panY + handleDocumentY * viewport.zoom
      highestInteractiveY = Math.min(highestInteractiveY, handleScreenY - 8)
    }
  }

  const aboveAnchor = highestInteractiveY - 10
  const below = aboveAnchor < 52
  const top = below ? selectionBottom + 14 : aboveAnchor

  return (
    <div
      className={`selection-quick-toolbar ${below ? 'below' : ''}`}
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
      <button title={copy.flipLeftRight} aria-label={copy.flipLeftRight} onClick={() => onMirror('left-right')}>↔</button>
      <button title={copy.flipTopBottom} aria-label={copy.flipTopBottom} onClick={() => onMirror('top-bottom')}>↕</button>
      <button title={copy.mirrorCopyLeftRight} aria-label={copy.mirrorCopyLeftRight} onClick={() => onMirrorCopy('left-right')}>⧉↔</button>
      <button title={copy.mirrorCopyTopBottom} aria-label={copy.mirrorCopyTopBottom} onClick={() => onMirrorCopy('top-bottom')}>⧉↕</button>
      <button title={copy.rotateLeft} aria-label={copy.rotateLeft} onClick={() => onRotate(-15)}>↺</button>
      <button title={copy.rotate180} aria-label={copy.rotate180} onClick={() => onRotate(180)}>180°</button>
      <button title={copy.rotateRight} aria-label={copy.rotateRight} onClick={() => onRotate(15)}>↻</button>
      <span className="selection-quick-separator" />
      <button className="selection-quick-danger" title={copy.delete} aria-label={copy.delete} onClick={onDelete}>×</button>
    </div>
  )
}

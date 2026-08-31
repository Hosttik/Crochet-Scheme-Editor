import type { Locale } from '../i18n'
import { SYMBOLS } from '../symbols'
import type { StitchElement, Viewport } from '../types'
import { IconButton } from '../ui/primitives'
import { selectionAabb } from './selection'
import { stitchVisualSize } from './stitchGeometry'
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

const QUICK_TOOLBAR_HALF_WIDTH = 172

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
    const directRotation = element && element.locked !== true && !element.parametricRow && (
      !element.guideAttachment || element.guideAttachment.orientation === 'keep'
    )
    if (directRotation && element) {
      const visualHeight = stitchVisualSize(element).height
      const handleLocalY = -visualHeight / 2 - 30
      const radians = (element.rotation * Math.PI) / 180
      const handleDocumentY = element.y + handleLocalY * Math.cos(radians)
      const handleScreenY = viewport.panY + handleDocumentY * viewport.zoom
      highestInteractiveY = Math.min(highestInteractiveY, handleScreenY - 8)
    }
  }

  // All stitches use the same placement rule. The previous compact-stitch
  // special case forced chain actions below the selection and could push the
  // toolbar out of the usable canvas near the footer. The real interaction
  // bounds already include the rotation handle, so prefer above consistently
  // and fall back below only when there is genuinely no room at the top.
  const aboveAnchor = highestInteractiveY - 10
  const below = aboveAnchor < 52
  const top = below ? selectionBottom + 14 : aboveAnchor

  return (
    <div
      className={`selection-quick-toolbar ${below ? 'below' : ''}`}
      style={{ left: `clamp(${QUICK_TOOLBAR_HALF_WIDTH}px, ${left}px, calc(100% - ${QUICK_TOOLBAR_HALF_WIDTH}px))`, top }}
      role="toolbar"
      aria-label={locale === 'ru' ? 'Быстрые действия с выделением' : 'Selection quick actions'}
    >
      <IconButton icon="duplicate" label={copy.duplicate} onClick={onDuplicate} />
      <IconButton
        icon={canUngroup ? 'ungroup' : 'group'}
        label={canUngroup ? copy.ungroup : copy.group}
        disabled={!canUngroup && !canGroup}
        onClick={canUngroup ? onUngroup : onGroup}
      />
      <span className="selection-quick-separator" />
      <IconButton className="selection-quick-mirror" icon="mirrorHorizontal" label={copy.flipLeftRight} onClick={() => onMirror('left-right')} />
      <IconButton className="selection-quick-mirror" icon="mirrorVertical" label={copy.flipTopBottom} onClick={() => onMirror('top-bottom')} />
      <IconButton className="selection-quick-mirror" icon="mirrorCopyHorizontal" label={copy.mirrorCopyLeftRight} onClick={() => onMirrorCopy('left-right')} />
      <IconButton className="selection-quick-mirror" icon="mirrorCopyVertical" label={copy.mirrorCopyTopBottom} onClick={() => onMirrorCopy('top-bottom')} />
      <span className="selection-quick-separator" />
      <IconButton icon="rotateLeft" label={copy.rotateLeft} onClick={() => onRotate(-15)} />
      <IconButton icon="rotate180" label={copy.rotate180} onClick={() => onRotate(180)} />
      <IconButton icon="rotateRight" label={copy.rotateRight} onClick={() => onRotate(15)} />
      <span className="selection-quick-separator" />
      <IconButton className="selection-quick-danger" icon="trash" label={copy.delete} onClick={onDelete} />
    </div>
  )
}

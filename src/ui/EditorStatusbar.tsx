import { UI, type Locale } from '../i18n'

type EditorStatusbarProps = {
  locale: Locale
  status: string
  stitchCount: number
  guideCount: number
  rowMarkerCount: number
  rulerCount: number
  selectedCount: number
}

export function EditorStatusbar({
  locale,
  status,
  stitchCount,
  guideCount,
  rowMarkerCount,
  rulerCount,
  selectedCount,
}: EditorStatusbarProps) {
  const t = UI[locale]

  return (
    <div className="statusbar" role="status" aria-live="polite" data-testid="canvas-statusbar">
      <span className="statusbar-state" title={status}>
        <i className="statusbar-state-dot" aria-hidden="true" />
        <strong>{status}</strong>
      </span>
      <span className="statusbar-document-meta">
        <span>{stitchCount} {t.stitchCount}</span>
        <span>{guideCount} {t.guideCount}</span>
        <span>{rowMarkerCount} {locale === 'ru' ? 'номеров рядов' : 'row numbers'}</span>
        <span>{rulerCount} {locale === 'ru' ? 'линеек' : 'rulers'}</span>
      </span>
      <span className={`statusbar-selection ${selectedCount ? 'has-selection' : ''}`}>
        {locale === 'ru' ? 'Выбрано' : 'Selected'}: <strong>{selectedCount}</strong>
      </span>
    </div>
  )
}

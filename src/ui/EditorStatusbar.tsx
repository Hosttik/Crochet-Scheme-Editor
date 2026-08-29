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
    <div className="statusbar">
      <span>{status}</span>
      <span>
        {stitchCount} {t.stitchCount} · {guideCount} {t.guideCount} · {rowMarkerCount}{' '}
        {locale === 'ru' ? 'номеров рядов' : 'row numbers'} · {rulerCount}{' '}
        {locale === 'ru' ? 'линеек' : 'rulers'}
        {selectedCount ? ` · ${selectedCount} ${t.selectedShort}` : ''}
      </span>
    </div>
  )
}

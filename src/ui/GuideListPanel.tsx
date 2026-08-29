import { UI, type Locale } from '../i18n'
import type { Guide } from '../types'
import { EditorIcon } from './icons'

type GuideListPanelProps = {
  locale: Locale
  guides: Guide[]
  selectedGuideId: string | null
  guideLabel: (guide: Guide) => string
  onSelectGuide: (guideId: string) => void
}

export function GuideListPanel({
  locale,
  guides,
  selectedGuideId,
  guideLabel,
  onSelectGuide,
}: GuideListPanelProps) {
  const t = UI[locale]

  return (
    <section className="panel-section guide-section">
      <div className="section-title-row">
        <h2>{t.guides}</h2>
        <span className="muted-text">{guides.length}</span>
      </div>
      {guides.length > 0 && (
        <div className="guide-list">
          {guides.map((guide, index) => (
            <button
              key={guide.id}
              className={selectedGuideId === guide.id ? 'active' : ''}
              onClick={() => onSelectGuide(guide.id)}
            >
              <span className={`visibility-dot ${guide.visible ? '' : 'hidden'}`} />
              <span>{index + 1}. {guideLabel(guide)}</span>
              {guide.locked && (
                <span aria-label={locale === 'ru' ? 'Заблокирована' : 'Locked'}>
                  <EditorIcon name="lock" size={14} className="lock-indicator-icon" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

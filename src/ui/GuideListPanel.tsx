import { useState } from 'react'
import { UI, type Locale } from '../i18n'
import type { Guide } from '../types'
import { EditorIcon } from './icons'

const GUIDE_PANEL_OPEN_STORAGE_KEY = 'crochet-ui-v2-guide-panel-open'

function guidePanelDefaultOpen() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(GUIDE_PANEL_OPEN_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

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
  const [panelOpen, setPanelOpen] = useState(guidePanelDefaultOpen)

  return (
    <details
      className="panel-section guide-section left-panel-disclosure"
      data-testid="guides-panel"
      open={panelOpen}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open
        setPanelOpen(nextOpen)
        try {
          window.localStorage.setItem(GUIDE_PANEL_OPEN_STORAGE_KEY, String(nextOpen))
        } catch {
          // Layout preference is non-critical.
        }
      }}
    >
      <summary>
        <EditorIcon name="chevronDown" size={13} className="left-panel-disclosure__chevron" />
        <span className="left-panel-disclosure__title">{t.guides}</span>
        <span className="left-panel-disclosure__count">{guides.length}</span>
      </summary>

      <div className="left-panel-disclosure__body">
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
      </div>
    </details>
  )
}

import type { ReactNode, RefObject } from 'react'
import { UI, type Locale } from '../i18n'
import type { AutosaveDelayMs } from '../types'

export type TopbarAutosaveState = 'loading' | 'saving' | 'saved' | 'error' | 'off'

export function EditorTopbar({
  locale,
  autosaveState,
  autosaveLabel,
  autosaveDelayMs,
  canUndo,
  canRedo,
  favoriteActions,
  loadInputRef,
  onAutosaveDelayChange,
  onLocaleChange,
  onUndo,
  onRedo,
  onSaveProject,
  onOpenProject,
  onExportSvg,
  onImportFile,
}: {
  locale: Locale
  autosaveState: TopbarAutosaveState
  autosaveLabel: string
  autosaveDelayMs: AutosaveDelayMs
  canUndo: boolean
  canRedo: boolean
  favoriteActions?: ReactNode
  loadInputRef: RefObject<HTMLInputElement | null>
  onAutosaveDelayChange: (delayMs: AutosaveDelayMs) => void
  onLocaleChange: (locale: Locale) => void
  onUndo: () => void
  onRedo: () => void
  onSaveProject: () => void
  onOpenProject: () => void
  onExportSvg: () => void
  onImportFile: (file: File) => void | Promise<void>
}) {
  const t = UI[locale]

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">C</div>
        <div>
          <strong>{t.brandTitle}</strong>
          <span>{t.brandSubtitle}</span>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="ui-v2-favorites-host">{favoriteActions}</div>
        <span className={`autosave-indicator ${autosaveState}`}>{autosaveLabel}</span>
        <label className="autosave-control">
          <span>{locale === 'ru' ? 'Автосохранение' : 'Autosave'}</span>
          <select
            aria-label={locale === 'ru' ? 'Автосохранение' : 'Autosave'}
            value={autosaveDelayMs}
            onChange={(event) => onAutosaveDelayChange(Number(event.target.value) as AutosaveDelayMs)}
          >
            <option value={0}>{locale === 'ru' ? 'Выкл' : 'Off'}</option>
            <option value={650}>{locale === 'ru' ? 'Быстро · 0,65 с' : 'Fast · 0.65 s'}</option>
            <option value={5000}>5 s</option>
            <option value={15000}>15 s</option>
            <option value={30000}>30 s</option>
            <option value={60000}>60 s</option>
          </select>
        </label>
        <div className="language-switch" aria-label={t.language}>
          <button className={`ghost-button ${locale === 'ru' ? 'active-lang' : ''}`} onClick={() => onLocaleChange('ru')}>RU</button>
          <button className={`ghost-button ${locale === 'en' ? 'active-lang' : ''}`} onClick={() => onLocaleChange('en')}>EN</button>
        </div>
        <span className="toolbar-separator" />
        <button className="ghost-button" onClick={onUndo} disabled={!canUndo}>{t.undo}</button>
        <button className="ghost-button" onClick={onRedo} disabled={!canRedo}>{t.redo}</button>
        <span className="toolbar-separator" />
        <button className="ghost-button" onClick={onSaveProject}>{t.saveJson}</button>
        <button className="ghost-button" onClick={onOpenProject}>{t.load}</button>
        <button className="primary-button" onClick={onExportSvg}>{t.exportSvg}</button>
        <input
          ref={loadInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void onImportFile(file)
            event.currentTarget.value = ''
          }}
        />
      </div>
    </header>
  )
}

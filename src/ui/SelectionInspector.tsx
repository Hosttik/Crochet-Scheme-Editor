import { useEffect, useState } from 'react'
import { GuideAttachmentPanel } from '../editor/GuideAttachmentPanel'
import { GuideRowGeneratorPanel } from '../editor/GuideRowGeneratorPanel'
import { ParametricRowEditorPanel } from '../editor/ParametricRowEditorPanel'
import { SelectionColorControl } from '../editor/SelectionColorControl'
import { TopologyEditorPanel } from '../editor/TopologyEditorPanel'
import { isElementLocked, isElementVisible } from '../editor/document'
import { lineGuideAngle, lineGuideLength, setLineGuideAngle, setLineGuideLength } from '../editor/guideGeometry'
import { clamp } from '../editor/geometry'
import { isPathGuide } from '../editor/pathGuides'
import { UI, type Locale } from '../i18n'
import type {
  Guide,
  GuideAttachment,
  GuideAttachmentOrientation,
  ParametricRowBinding,
  StitchElement,
} from '../types'
import { EditorIcon } from './icons'

type SelectionInspectorProps = {
  locale: Locale
  elements: StitchElement[]
  guides: Guide[]
  selectedIds: string[]
  selectedElement: StitchElement | null
  selectedGuide: Guide | null
  selectedParametricRow: ParametricRowBinding | null
  selectedParametricGuide: Guide | null
  selectedParametricParentCount?: number
  selectedTopologyParentId: string | null
  lockedSelectedCount: number
  editableSelectedCount: number
  guideLabel: (guide: Guide) => string
  onSelectionColorChange: (color?: string) => void
  onParametricRowChange: (binding: ParametricRowBinding) => void
  onParametricRowDelete: (rowId: string) => void
  onTopologyParentSelect: (id: string | null) => void
  onRotate: (delta: number) => void
  onAttachSelectedToGuide: (guideId: string, orientation: GuideAttachmentOrientation) => void
  onUpdateSelectedGuideAttachment: (attachment: GuideAttachment) => void
  onDetachSelectedFromGuide: () => void
  onCopy: () => void
  onDuplicate: () => void
  onToggleElementVisible: (id: string) => void
  onToggleElementLocked: (id: string) => void
  onDelete: () => void
  onGuideChange: (updater: (guide: Guide) => Guide) => void
  onFitSelectedLineToProject: () => void
  onReverseGuide: (guide: Guide) => void
  onGenerateGuideRow: (generated: StitchElement[]) => void
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const [draft, setDraft] = useState(String(Number.isFinite(value) ? value : 0))
  useEffect(() => setDraft(String(Number.isFinite(value) ? value : 0)), [value])

  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }
    if (parsed !== value) onChange(parsed)
  }

  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(String(value))
            event.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}

export function SelectionInspector({
  locale,
  elements,
  guides,
  selectedIds,
  selectedElement,
  selectedGuide,
  selectedParametricRow,
  selectedParametricGuide,
  selectedParametricParentCount,
  selectedTopologyParentId,
  lockedSelectedCount,
  editableSelectedCount,
  guideLabel,
  onSelectionColorChange,
  onParametricRowChange,
  onParametricRowDelete,
  onTopologyParentSelect,
  onRotate,
  onAttachSelectedToGuide,
  onUpdateSelectedGuideAttachment,
  onDetachSelectedFromGuide,
  onCopy,
  onDuplicate,
  onToggleElementVisible,
  onToggleElementLocked,
  onDelete,
  onGuideChange,
  onFitSelectedLineToProject,
  onReverseGuide,
  onGenerateGuideRow,
}: SelectionInspectorProps) {
  const t = UI[locale]

  return (
    <section className="panel-section right-panel-context" data-testid="selection-context-panel">
      <div className="section-title-row">
        <h2>{t.selection}</h2>
        {lockedSelectedCount > 0 && (
          <span className="muted-text"><EditorIcon name="lock" size={14} className="lock-indicator-icon" /> {lockedSelectedCount}</span>
        )}
      </div>

      {lockedSelectedCount > 0 && (
        <p className="locked-selection-note">
          {locale === 'ru'
            ? `Заблокировано в выделении: ${lockedSelectedCount}. Их можно выбирать и просматривать, но изменения применяются только к разблокированным.`
            : `${lockedSelectedCount} selected locked stitch(es). They can be inspected, while edits only affect unlocked stitches.`}
        </p>
      )}

      {editableSelectedCount > 0 && (
        <SelectionColorControl
          locale={locale}
          colors={elements
            .filter((element) => selectedIds.includes(element.id) && !isElementLocked(element))
            .map((element) => element.color)}
          onChange={onSelectionColorChange}
        />
      )}

      {selectedParametricRow && selectedParametricGuide ? (
        <>
          <ParametricRowEditorPanel
            binding={selectedParametricRow}
            guide={selectedParametricGuide}
            locale={locale}
            parentStitchCount={selectedParametricParentCount}
            onChange={onParametricRowChange}
            onDelete={() => onParametricRowDelete(selectedParametricRow.id)}
          />
          <TopologyEditorPanel
            elements={elements}
            binding={selectedParametricRow}
            locale={locale}
            selectedParentId={selectedTopologyParentId}
            onSelectParentId={onTopologyParentSelect}
            onChange={onParametricRowChange}
          />
        </>
      ) : selectedElement ? (
        <div className="selection-card compact-selection-card">
          {!isElementLocked(selectedElement) && (
            <>
              <div className="rotation-controls">
                <button onClick={() => onRotate(-15)}>−15°</button>
                <button onClick={() => onRotate(15)}>+15°</button>
              </div>
              <GuideAttachmentPanel
                locale={locale}
                element={selectedElement}
                guides={guides}
                onAttach={onAttachSelectedToGuide}
                onChange={onUpdateSelectedGuideAttachment}
                onDetach={onDetachSelectedFromGuide}
              />
              <div className="selection-actions">
                <button onClick={onCopy}>{t.copy}</button>
                <button onClick={onDuplicate}>{t.duplicate}</button>
              </div>
            </>
          )}
          <div className="layer-selection-controls">
            <button onClick={() => onToggleElementVisible(selectedElement.id)}>{isElementVisible(selectedElement) ? t.hideLayer : t.showLayer}</button>
            <button onClick={() => onToggleElementLocked(selectedElement.id)}>{isElementLocked(selectedElement) ? t.unlockLayer : t.lockLayer}</button>
          </div>
          {!isElementLocked(selectedElement) && <button className="danger-button" onClick={onDelete}>{t.delete}</button>}
        </div>
      ) : selectedIds.length > 1 ? (
        <div className="multi-selection-card">
          <strong>{t.selectedCount}: {selectedIds.length}</strong>
          <small>{t.groupMoveHint}</small>
          {editableSelectedCount > 0 && (
            <>
              <div className="rotation-controls">
                <button onClick={() => onRotate(-15)}>−15°</button>
                <button onClick={() => onRotate(15)}>+15°</button>
              </div>
              <div className="selection-actions">
                <button onClick={onCopy}>{t.copy}</button>
                <button onClick={onDuplicate}>{t.duplicate}</button>
              </div>
              <button className="danger-button" onClick={onDelete}>{t.delete}</button>
            </>
          )}
        </div>
      ) : selectedGuide ? (
        <div className="guide-editor">
          <div className="guide-editor-heading"><strong>{guideLabel(selectedGuide)}</strong><span>{selectedGuide.type}</span></div>
          <label className="toggle-row compact-toggle">
            <span>{t.visible}</span>
            <input type="checkbox" checked={selectedGuide.visible} onChange={(event) => onGuideChange((guide) => ({ ...guide, visible: event.target.checked }))} />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{locale === 'ru' ? 'Заблокировать направляющую' : 'Lock guide'}</span>
            <input type="checkbox" checked={selectedGuide.locked === true} onChange={(event) => onGuideChange((guide) => ({ ...guide, locked: event.target.checked }))} />
          </label>

          <fieldset className="guide-locked-fields" disabled={selectedGuide.locked === true}>
            {selectedGuide.type === 'arc' && (
              <div className="number-field-grid">
                <NumberField label={t.centerX} value={selectedGuide.center.x} onChange={(value) => onGuideChange((guide) => guide.type === 'arc' ? { ...guide, center: { ...guide.center, x: value } } : guide)} />
                <NumberField label={t.centerY} value={selectedGuide.center.y} onChange={(value) => onGuideChange((guide) => guide.type === 'arc' ? { ...guide, center: { ...guide.center, y: value } } : guide)} />
                <NumberField label={t.radius} value={selectedGuide.radius} min={10} onChange={(value) => onGuideChange((guide) => guide.type === 'arc' ? { ...guide, radius: Math.max(10, value) } : guide)} />
                <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={72} onChange={(value) => onGuideChange((guide) => guide.type === 'arc' ? { ...guide, divisions: Math.round(clamp(value, 1, 72)) } : guide)} />
                <NumberField label={t.startAngle} value={selectedGuide.startAngle} onChange={(value) => onGuideChange((guide) => guide.type === 'arc' ? { ...guide, startAngle: value } : guide)} />
                <NumberField label={t.endAngle} value={selectedGuide.endAngle} onChange={(value) => onGuideChange((guide) => guide.type === 'arc' ? { ...guide, endAngle: value } } : guide)} />
              </div>
            )}

            {selectedGuide.type === 'line' && (
              <div className="number-field-grid">
                <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Длина' : 'Length'} value={Math.round(lineGuideLength(selectedGuide) * 100) / 100} min={1} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? setLineGuideLength(guide, value) : guide)} />
                <NumberField label={locale === 'ru' ? 'Угол °' : 'Angle °'} value={Math.round(lineGuideAngle(selectedGuide) * 100) / 100} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? setLineGuideAngle(guide, value) : guide)} />
                <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => onGuideChange((guide) => guide.type === 'line' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
                <button type="button" onClick={onFitSelectedLineToProject}>{locale === 'ru' ? 'По размеру проекта' : 'Fit to project'}</button>
              </div>
            )}

            {selectedGuide.type === 'curve' && (
              <div className="number-field-grid">
                <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                <NumberField label="C1 X" value={selectedGuide.control1.x} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, control1: { ...guide.control1, x: value } } : guide)} />
                <NumberField label="C1 Y" value={selectedGuide.control1.y} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, control1: { ...guide.control1, y: value } } : guide)} />
                <NumberField label="C2 X" value={selectedGuide.control2.x} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, control2: { ...guide.control2, x: value } } : guide)} />
                <NumberField label="C2 Y" value={selectedGuide.control2.y} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, control2: { ...guide.control2, y: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => onGuideChange((guide) => guide.type === 'curve' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
              </div>
            )}

            {selectedGuide.type === 'parabola' && (
              <div className="number-field-grid">
                <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Вершина X' : 'Control X'} value={selectedGuide.control.x} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, control: { ...guide.control, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Вершина Y' : 'Control Y'} value={selectedGuide.control.y} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, control: { ...guide.control, y: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => onGuideChange((guide) => guide.type === 'parabola' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
              </div>
            )}

            {selectedGuide.type === 'grid' && (
              <div className="number-field-grid">
                <NumberField label={t.centerX} value={selectedGuide.origin.x} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, origin: { ...guide.origin, x: value } } : guide)} />
                <NumberField label={t.centerY} value={selectedGuide.origin.y} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, origin: { ...guide.origin, y: value } } : guide)} />
                <NumberField label={t.rows} value={selectedGuide.rows} min={1} max={50} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, rows: Math.round(clamp(value, 1, 50)) } : guide)} />
                <NumberField label={t.columns} value={selectedGuide.columns} min={1} max={50} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, columns: Math.round(clamp(value, 1, 50)) } : guide)} />
                <NumberField label={t.spacingX} value={selectedGuide.spacingX} min={5} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, spacingX: Math.max(5, value) } : guide)} />
                <NumberField label={t.spacingY} value={selectedGuide.spacingY} min={5} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, spacingY: Math.max(5, value) } : guide)} />
                <NumberField label={t.rotation} value={selectedGuide.rotation} onChange={(value) => onGuideChange((guide) => guide.type === 'grid' ? { ...guide, rotation: value } : guide)} />
              </div>
            )}

            {selectedGuide.type === 'radial-grid' && (
              <div className="number-field-grid">
                <NumberField label={t.centerX} value={selectedGuide.center.x} onChange={(value) => onGuideChange((guide) => guide.type === 'radial-grid' ? { ...guide, center: { ...guide.center, x: value } } : guide)} />
                <NumberField label={t.centerY} value={selectedGuide.center.y} onChange={(value) => onGuideChange((guide) => guide.type === 'radial-grid' ? { ...guide, center: { ...guide.center, y: value } } : guide)} />
                <NumberField label={t.rings} value={selectedGuide.ringCount} min={1} max={30} onChange={(value) => onGuideChange((guide) => guide.type === 'radial-grid' ? { ...guide, ringCount: Math.round(clamp(value, 1, 30)) } : guide)} />
                <NumberField label={t.ringSpacing} value={selectedGuide.ringSpacing} min={5} onChange={(value) => onGuideChange((guide) => guide.type === 'radial-grid' ? { ...guide, ringSpacing: Math.max(5, value) } : guide)} />
                <NumberField label={t.sectors} value={selectedGuide.sectorCount} min={2} max={72} onChange={(value) => onGuideChange((guide) => guide.type === 'radial-grid' ? { ...guide, sectorCount: Math.round(clamp(value, 2, 72)) } : guide)} />
                <NumberField label={t.startAngle} value={selectedGuide.startAngle} onChange={(value) => onGuideChange((guide) => guide.type === 'radial-grid' ? { ...guide, startAngle: value } : guide)} />
              </div>
            )}
          </fieldset>

          {isPathGuide(selectedGuide) && (
            <div className="guide-direction-actions">
              <button disabled={selectedGuide.locked === true} onClick={() => onReverseGuide(selectedGuide)}>{locale === 'ru' ? '↔ Сменить направление' : '↔ Reverse direction'}</button>
              <small>{locale === 'ru' ? 'Также: двойной клик по направляющей' : 'Also: double-click the guide'}</small>
            </div>
          )}

          {(selectedGuide.type === 'arc' || selectedGuide.type === 'radial-grid') && (
            <GuideRowGeneratorPanel
              guide={selectedGuide}
              locale={locale}
              onGenerate={onGenerateGuideRow}
            />
          )}

          <p className="guide-note">{t.guideNote}</p>
          <button className="danger-button" disabled={selectedGuide.locked === true} onClick={onDelete}>{t.deleteGuide}</button>
        </div>
      ) : (
        <p className="empty-state">{t.emptySelection}</p>
      )}
    </section>
  )
}

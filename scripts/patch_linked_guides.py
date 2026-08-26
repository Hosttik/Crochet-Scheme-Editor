from pathlib import Path


def replace(text: str, old: str, new: str, label: str, count: int | None = None) -> str:
    if old not in text:
        raise SystemExit(f'Missing patch target: {label}')
    return text.replace(old, new) if count is None else text.replace(old, new, count)


path = Path('src/App.tsx')
text = path.read_text()

text = replace(
    text,
    "import { GuideRenderer } from './editor/GuideRenderer'\n",
    "import { GuideRenderer } from './editor/GuideRenderer'\nimport { GuideAttachmentPanel } from './editor/GuideAttachmentPanel'\n",
    'attachment panel import',
)
text = replace(
    text,
    "import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'\n",
    "import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'\nimport {\n  attachElementToGuide,\n  elementFromAttachment,\n  isPathGuide,\n  moveAttachedElement,\n  reconcileGuideAttachments,\n} from './editor/pathGuides'\n",
    'path guides import',
)
text = replace(
    text,
    "  CrochetProject,\n  Guide,\n  OrientationMode,",
    "  CrochetProject,\n  Guide,\n  GuideAttachment,\n  GuideAttachmentOrientation,\n  OrientationMode,",
    'attachment type imports',
)
text = replace(
    text,
    "function guideLabel(guide: Guide, locale: Locale) {\n  const t = UI[locale]\n  if (guide.type === 'arc') return t.arc\n  if (guide.type === 'grid') return t.rectangularGrid\n  return t.radialGrid\n}",
    "function guideLabel(guide: Guide, locale: Locale) {\n  const t = UI[locale]\n  if (guide.type === 'arc') return t.arc\n  if (guide.type === 'line') return locale === 'ru' ? 'Линия' : 'Line'\n  if (guide.type === 'curve') return locale === 'ru' ? 'Кривая' : 'Curve'\n  if (guide.type === 'grid') return t.rectangularGrid\n  return t.radialGrid\n}",
    'guide label',
)
text = replace(
    text,
    "function createId() {\n  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()\n  return `${Date.now()}-${Math.random().toString(16).slice(2)}`\n}\n",
    "function createId() {\n  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()\n  return `${Date.now()}-${Math.random().toString(16).slice(2)}`\n}\n\nfunction reconcileLinkedElements(elements: StitchElement[], guides: Guide[]) {\n  return reconcileGuideAttachments(reconcileParametricRows(elements, guides, createId), guides)\n}\n",
    'linked reconcile helper',
)
text = replace(text, '    schemaVersion: 13,', '    schemaVersion: 14,', 'schema version', 1)
text = replace(
    text,
    "          setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))",
    "          setElements(reconcileLinkedElements(project.elements, project.guides ?? []))",
    'autosave restore',
)
text = replace(
    text,
    "    setElements((current) => reconcileParametricRows(current, guides, createId))",
    "    setElements((current) => reconcileLinkedElements(current, guides))",
    'guide reconcile effect',
)
text = replace(
    text,
    "    setElements(reconcileParametricRows(normalized.elements, normalized.guides ?? [], createId))",
    "    setElements(reconcileLinkedElements(normalized.elements, normalized.guides ?? []))",
    'local project restore',
)
text = replace(
    text,
    "      setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))",
    "      setElements(reconcileLinkedElements(project.elements, project.guides ?? []))",
    'json project restore',
)
text = replace(
    text,
    "![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(raw.schemaVersion)",
    "![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(raw.schemaVersion)",
    'load schema allow list',
)

old_nudge = """  const nudgeSelection = useCallback((dx: number, dy: number) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    const movable = elements.some(
      (element) => selected.has(element.id) && !element.parametricRow && !isElementLocked(element),
    )
    if (!movable) return
    duplicateSeriesRef.current = null
    commitElements(elements.map((element) =>
      selected.has(element.id) && !element.parametricRow && !isElementLocked(element)
        ? { ...element, x: element.x + dx, y: element.y + dy }
        : element,
    ))
    setStatus(locale === 'ru' ? `Сдвиг: ${dx}, ${dy}` : `Nudged: ${dx}, ${dy}`)
  }, [commitElements, elements, locale, unlockedSelectedIds])
"""
new_nudge = """  const nudgeSelection = useCallback((dx: number, dy: number) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    const movable = elements.some(
      (element) => selected.has(element.id) && !element.parametricRow && !isElementLocked(element),
    )
    if (!movable) return
    duplicateSeriesRef.current = null
    commitElements(elements.map((element) => {
      if (!selected.has(element.id) || element.parametricRow || isElementLocked(element)) return element
      const attachment = element.guideAttachment
      const guide = attachment ? guides.find((item) => item.id === attachment.guideId) : undefined
      if (attachment && guide && isPathGuide(guide)) {
        return moveAttachedElement(element, guide, { x: element.x + dx, y: element.y + dy })
      }
      return { ...element, x: element.x + dx, y: element.y + dy }
    }))
    setStatus(locale === 'ru' ? `Сдвиг: ${dx}, ${dy}` : `Nudged: ${dx}, ${dy}`)
  }, [commitElements, elements, guides, locale, unlockedSelectedIds])
"""
text = replace(text, old_nudge, new_nudge, 'attached nudge')

text = replace(
    text,
    """      const rawDelta = {
        x: documentPoint.x - drag.startPointer.x,
        y: documentPoint.y - drag.startPointer.y,
      }
      const proposedReference: StitchElement = {
""",
    """      const rawDelta = {
        x: documentPoint.x - drag.startPointer.x,
        y: documentPoint.y - drag.startPointer.y,
      }

      if (drag.selectedIds.length === 1 && reference.guideAttachment) {
        const attachedGuide = guides.find((guide) => guide.id === reference.guideAttachment?.guideId)
        if (attachedGuide && isPathGuide(attachedGuide)) {
          const moved = moveAttachedElement(reference, attachedGuide, {
            x: reference.x + rawDelta.x,
            y: reference.y + rawDelta.y,
          })
          interactionMovedRef.current = Math.hypot(moved.x - reference.x, moved.y - reference.y) > 0.5
          setSnapTarget(null)
          setElements(drag.startSnapshot.elements.map((element) =>
            element.id === reference.id ? moved : element,
          ))
          return
        }
      }

      const proposedReference: StitchElement = {
""",
    'attached drag',
)
text = replace(
    text,
    """      if (mode === 'move') setStatus(t.guideMoved)
      else if (mode === 'resize') setStatus(t.guideResized)
      else setStatus(t.guideRotated)
""",
    """      if (mode === 'move') setStatus(t.guideMoved)
      else if (mode === 'resize' || mode === 'start' || mode === 'end' || mode === 'control1' || mode === 'control2') setStatus(t.guideResized)
      else setStatus(t.guideRotated)
""",
    'guide manipulation status',
)

old_rotate = """  const rotateSelected = (delta: number) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    commitElements(
      elements.map((element) =>
        selected.has(element.id) && !element.parametricRow
          ? { ...element, rotation: element.rotation + delta }
          : element,
      ),
    )
  }
"""
new_rotate = """  const rotateSelected = (delta: number) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    commitElements(elements.map((element) => {
      if (!selected.has(element.id) || element.parametricRow) return element
      const attachment = element.guideAttachment
      const guide = attachment ? guides.find((item) => item.id === attachment.guideId) : undefined
      if (attachment && attachment.orientation !== 'keep' && guide && isPathGuide(guide)) {
        return elementFromAttachment(element, guide, {
          ...attachment,
          rotationOffset: attachment.rotationOffset + delta,
        })
      }
      return { ...element, rotation: element.rotation + delta }
    }))
  }
"""
text = replace(text, old_rotate, new_rotate, 'attached rotate')

attachment_handlers = """

  const attachSelectedToGuide = (guideId: string, orientation: GuideAttachmentOrientation) => {
    if (!selectedElement || selectedElement.parametricRow) return
    const guide = guides.find((item) => item.id === guideId)
    if (!guide || !isPathGuide(guide)) return
    const attached = attachElementToGuide(selectedElement, guide, orientation)
    commitElements(elements.map((element) => element.id === selectedElement.id ? attached : element))
    setSelectedIds([selectedElement.id])
    setStatus(locale === 'ru' ? 'Элемент закреплён на направляющей' : 'Stitch attached to guide')
  }

  const updateSelectedGuideAttachment = (attachment: GuideAttachment) => {
    if (!selectedElement || selectedElement.parametricRow) return
    const guide = guides.find((item) => item.id === attachment.guideId)
    if (!guide || !isPathGuide(guide)) return
    const attached = elementFromAttachment(selectedElement, guide, attachment)
    commitElements(elements.map((element) => element.id === selectedElement.id ? attached : element))
    setSelectedIds([selectedElement.id])
  }

  const detachSelectedFromGuide = () => {
    if (!selectedElement?.guideAttachment) return
    commitElements(elements.map((element) =>
      element.id === selectedElement.id ? { ...element, guideAttachment: undefined } : element,
    ))
    setSelectedIds([selectedElement.id])
    setStatus(locale === 'ru' ? 'Связь с направляющей снята' : 'Guide attachment removed')
  }
"""
text = replace(
    text,
    "    setStatus(locale === 'ru' ? 'Цвет выделения изменён' : 'Selection color changed')\n  }\n\n  const addGuide",
    "    setStatus(locale === 'ru' ? 'Цвет выделения изменён' : 'Selection color changed')\n  }" + attachment_handlers + "\n  const addGuide",
    'attachment handlers',
)

old_guides = """    if (type === 'arc') {
      guide = {
        id,
        type,
        center,
        radius: 120,
        startAngle: 0,
        endAngle: 180,
        divisions: 12,
        visible: true,
      }
    } else if (type === 'grid') {
      guide = {
        id,
        type,
        origin: center,
        rows: 5,
        columns: 7,
        spacingX: 40,
        spacingY: 40,
        rotation: 0,
        visible: true,
      }
    } else {
      guide = {
        id,
        type,
        center,
        ringCount: 4,
        ringSpacing: 40,
        sectorCount: 12,
        startAngle: 0,
        visible: true,
      }
    }
"""
new_guides = """    if (type === 'arc') {
      guide = {
        id,
        type,
        center,
        radius: 120,
        startAngle: 0,
        endAngle: 180,
        divisions: 12,
        visible: true,
      }
    } else if (type === 'line') {
      guide = {
        id,
        type,
        start: { x: center.x - 130, y: center.y },
        end: { x: center.x + 130, y: center.y },
        divisions: 12,
        visible: true,
      }
    } else if (type === 'curve') {
      guide = {
        id,
        type,
        start: { x: center.x - 150, y: center.y },
        control1: { x: center.x - 70, y: center.y - 90 },
        control2: { x: center.x + 70, y: center.y + 90 },
        end: { x: center.x + 150, y: center.y },
        divisions: 16,
        visible: true,
      }
    } else if (type === 'grid') {
      guide = {
        id,
        type,
        origin: center,
        rows: 5,
        columns: 7,
        spacingX: 40,
        spacingY: 40,
        rotation: 0,
        visible: true,
      }
    } else {
      guide = {
        id,
        type,
        center,
        ringCount: 4,
        ringSpacing: 40,
        sectorCount: 12,
        startAngle: 0,
        visible: true,
      }
    }
"""
text = replace(text, old_guides, new_guides, 'new guide creation')

text = replace(
    text,
    """          <div className="guide-add-grid">
            <button onClick={() => addGuide('arc')}><strong>⌒</strong><span>{t.arc}</span></button>
            <button onClick={() => addGuide('grid')}><strong>▦</strong><span>{t.grid}</span></button>
            <button onClick={() => addGuide('radial-grid')}><strong>◎</strong><span>{t.radial}</span></button>
          </div>
""",
    """          <div className="guide-add-grid">
            <button onClick={() => addGuide('arc')}><strong>⌒</strong><span>{t.arc}</span></button>
            <button onClick={() => addGuide('line')}><strong>／</strong><span>{locale === 'ru' ? 'Линия' : 'Line'}</span></button>
            <button onClick={() => addGuide('curve')}><strong>∿</strong><span>{locale === 'ru' ? 'Кривая' : 'Curve'}</span></button>
            <button onClick={() => addGuide('grid')}><strong>▦</strong><span>{t.grid}</span></button>
            <button onClick={() => addGuide('radial-grid')}><strong>◎</strong><span>{t.radial}</span></button>
          </div>
""",
    'guide buttons',
)

attachment_panel = """
              <GuideAttachmentPanel
                locale={locale}
                element={selectedElement}
                guides={guides}
                onAttach={attachSelectedToGuide}
                onChange={updateSelectedGuideAttachment}
                onDetach={detachSelectedFromGuide}
              />
"""
text = replace(
    text,
    """              <div className="rotation-controls">
                <button onClick={() => rotateSelected(-15)}>−15°</button>
                <button onClick={() => rotateSelected(15)}>+15°</button>
              </div>
              <div className="selection-actions">
""",
    """              <div className="rotation-controls">
                <button onClick={() => rotateSelected(-15)}>−15°</button>
                <button onClick={() => rotateSelected(15)}>+15°</button>
              </div>""" + attachment_panel + """              <div className="selection-actions">
""",
    'attachment panel placement',
    1,
)

path_fields = """

              {selectedGuide.type === 'line' && (
                <div className="number-field-grid">
                  <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
                </div>
              )}

              {selectedGuide.type === 'curve' && (
                <div className="number-field-grid">
                  <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                  <NumberField label="C1 X" value={selectedGuide.control1.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control1: { ...guide.control1, x: value } } : guide)} />
                  <NumberField label="C1 Y" value={selectedGuide.control1.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control1: { ...guide.control1, y: value } } : guide)} />
                  <NumberField label="C2 X" value={selectedGuide.control2.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control2: { ...guide.control2, x: value } } : guide)} />
                  <NumberField label="C2 Y" value={selectedGuide.control2.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control2: { ...guide.control2, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
                </div>
              )}
"""
text = replace(
    text,
    "\n\n              {selectedGuide.type === 'grid' && (",
    path_fields + "\n              {selectedGuide.type === 'grid' && (",
    'line curve numeric fields',
)
text = replace(
    text,
    """              <GuideRowGeneratorPanel
                guide={selectedGuide}
                locale={locale}
                onGenerate={handleGenerateGuideRow}
              />
""",
    """              {(selectedGuide.type === 'arc' || selectedGuide.type === 'radial-grid') && (
                <GuideRowGeneratorPanel
                  guide={selectedGuide}
                  locale={locale}
                  onGenerate={handleGenerateGuideRow}
                />
              )}
""",
    'row generator compatibility',
)
path.write_text(text)

path = Path('src/editor/ProductivityPanel.tsx')
text = path.read_text()
text = replace(
    text,
    "import { DraftNumberInput } from './DraftNumberInput'\n",
    "import { DraftNumberInput } from './DraftNumberInput'\nimport { guideCenter } from './guideManipulation'\n",
    'productivity guideCenter import',
)
old_name = """function guideName(guide: Guide, locale: Locale, index: number) {
  const name = guide.type === 'arc'
    ? locale === 'ru' ? 'Дуга' : 'Arc'
    : guide.type === 'grid'
      ? locale === 'ru' ? 'Сетка' : 'Grid'
      : locale === 'ru' ? 'Радиальная сетка' : 'Radial grid'
  return `${index + 1}. ${name}`
}
"""
new_name = """function guideName(guide: Guide, locale: Locale, index: number) {
  const name = guide.type === 'arc'
    ? locale === 'ru' ? 'Дуга' : 'Arc'
    : guide.type === 'line'
      ? locale === 'ru' ? 'Линия' : 'Line'
      : guide.type === 'curve'
        ? locale === 'ru' ? 'Кривая' : 'Curve'
        : guide.type === 'grid'
          ? locale === 'ru' ? 'Сетка' : 'Grid'
          : locale === 'ru' ? 'Радиальная сетка' : 'Radial grid'
  return `${index + 1}. ${name}`
}
"""
text = replace(text, old_name, new_name, 'productivity guide names')
text = replace(
    text,
    """      const center = selectedGuide
        ? selectedGuide.type === 'grid' ? selectedGuide.origin : selectedGuide.center
        : undefined
""",
    """      const center = selectedGuide ? guideCenter(selectedGuide) : undefined
""",
    'productivity circular center',
)
path.write_text(text)

path = Path('src/i18n.ts')
text = path.read_text().replace('Векторный редактор схем · v1.10.1', 'Векторный редактор схем · v1.11')
text = text.replace('Vector pattern workspace · v1.10.1', 'Vector pattern workspace · v1.11')
path.write_text(text)

path = Path('package.json')
text = path.read_text().replace('"version": "1.10.1"', '"version": "1.11.0"')
path.write_text(text)

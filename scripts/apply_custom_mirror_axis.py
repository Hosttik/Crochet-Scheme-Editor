from pathlib import Path
import re


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, got {count}")
    target.write_text(text.replace(old, new, 1))
    print("patched", label)


p = Path("src/editor/productivity.ts")
text = p.read_text()
pattern = r"export function mirrorElements\([\s\S]*?\n}\n\nfunction cloneGroupIdMap"
replacement = """export function mirrorElementsAroundAxis(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  coordinate: number,
) {
  if (!Number.isFinite(coordinate)) return elements
  const selected = new Set(ids)

  return elements.map((element) => {
    if (!selected.has(element.id) || element.parametricRow) return element
    if (axis === 'left-right') {
      return {
        ...element,
        x: coordinate * 2 - element.x,
        rotation: normalizeDegrees(180 - element.rotation),
        guideAttachment: undefined,
      }
    }
    return {
      ...element,
      y: coordinate * 2 - element.y,
      rotation: normalizeDegrees(-element.rotation),
      guideAttachment: undefined,
    }
  })
}

export function mirrorElements(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
) {
  const pivot = selectionPivot(elements, ids)
  if (!pivot) return elements
  const coordinate = axis === 'left-right' ? pivot.x : pivot.y
  return mirrorElementsAroundAxis(elements, ids, axis, coordinate)
}

function cloneGroupIdMap"""
text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit(f"productivity mirror block: expected one match, got {count}")
p.write_text(text)
print("patched productivity mirror block")

replace_once(
    "src/editor/ProductivityPanel.tsx",
    "import { repeatPreviewSelectionKind, shouldShowRepeatPreview } from './repeatPreview'\n",
    "import { repeatPreviewSelectionKind, shouldShowRepeatPreview } from './repeatPreview'\nimport type { MirrorAxisState } from './MirrorAxisOverlay'\n",
    "ProductivityPanel import",
)
replace_once(
    "src/editor/ProductivityPanel.tsx",
    "    mirrorHint: 'Flip использует ось через центр выделения. Зеркальная копия создаётся рядом с оригиналом.',\n",
    "    mirrorHint: 'Быстрый Flip использует центр выделения. Для произвольного центра включите редактируемую ось.',\n"
    "    verticalAxis: 'Вертикальная ось',\n"
    "    horizontalAxis: 'Горизонтальная ось',\n"
    "    axisX: 'Позиция оси X',\n"
    "    axisY: 'Позиция оси Y',\n"
    "    axisCenter: 'По центру',\n"
    "    flipCustom: 'Отразить по оси',\n"
    "    mirrorCopyCustom: 'Копия через ось',\n"
    "    hideAxis: 'Скрыть ось',\n"
    "    axisHint: 'Красную пунктирную ось можно перетаскивать прямо на холсте.',\n",
    "ProductivityPanel ru copy",
)
replace_once(
    "src/editor/ProductivityPanel.tsx",
    "    mirrorHint: 'Flip uses an axis through the selection center. Mirrored copy creates a separate adjacent object.',\n",
    "    mirrorHint: 'Quick Flip uses the selection center. Enable an editable axis for a custom mirror center.',\n"
    "    verticalAxis: 'Vertical axis',\n"
    "    horizontalAxis: 'Horizontal axis',\n"
    "    axisX: 'Axis X position',\n"
    "    axisY: 'Axis Y position',\n"
    "    axisCenter: 'Center on selection',\n"
    "    flipCustom: 'Flip across axis',\n"
    "    mirrorCopyCustom: 'Copy across axis',\n"
    "    hideAxis: 'Hide axis',\n"
    "    axisHint: 'Drag the red dashed axis directly on the canvas.',\n",
    "ProductivityPanel en copy",
)
replace_once(
    "src/editor/ProductivityPanel.tsx",
    "  onMirrorCopy,\n  onRepeat,\n}: {",
    "  onMirrorCopy,\n"
    "  mirrorAxis,\n"
    "  onConfigureMirrorAxis,\n"
    "  onMirrorAxisCoordinateChange,\n"
    "  onCenterMirrorAxis,\n"
    "  onHideMirrorAxis,\n"
    "  onMirrorAtCustomAxis,\n"
    "  onMirrorCopyAtCustomAxis,\n"
    "  onRepeat,\n}: {",
    "ProductivityPanel destructure",
)
replace_once(
    "src/editor/ProductivityPanel.tsx",
    "  onMirrorCopy: (axis: 'left-right' | 'top-bottom') => void\n  onRepeat: (options: RepeatOptions) => void",
    "  onMirrorCopy: (axis: 'left-right' | 'top-bottom') => void\n"
    "  mirrorAxis: MirrorAxisState | null\n"
    "  onConfigureMirrorAxis: (axis: MirrorAxisState['axis']) => void\n"
    "  onMirrorAxisCoordinateChange: (coordinate: number) => void\n"
    "  onCenterMirrorAxis: () => void\n"
    "  onHideMirrorAxis: () => void\n"
    "  onMirrorAtCustomAxis: () => void\n"
    "  onMirrorCopyAtCustomAxis: () => void\n"
    "  onRepeat: (options: RepeatOptions) => void",
    "ProductivityPanel prop types",
)

custom_controls = """          <div className="mirror-axis-config">
            <div className="productivity-mode-tabs mirror-axis-tabs">
              <button className={mirrorAxis?.axis === 'left-right' ? 'active' : ''} disabled={!canTransform} onClick={() => onConfigureMirrorAxis('left-right')}>{copy.verticalAxis}</button>
              <button className={mirrorAxis?.axis === 'top-bottom' ? 'active' : ''} disabled={!canTransform} onClick={() => onConfigureMirrorAxis('top-bottom')}>{copy.horizontalAxis}</button>
            </div>
            {mirrorAxis && (
              <>
                <small className="muted-text mirror-axis-hint">{copy.axisHint}</small>
                <label className="productivity-field">
                  <span>{mirrorAxis.axis === 'left-right' ? copy.axisX : copy.axisY}</span>
                  <DraftNumberInput ariaLabel={mirrorAxis.axis === 'left-right' ? copy.axisX : copy.axisY} value={mirrorAxis.coordinate} step={1} onChange={onMirrorAxisCoordinateChange} />
                </label>
                <div className="productivity-actions">
                  <button onClick={onCenterMirrorAxis}>{copy.axisCenter}</button>
                  <button onClick={onHideMirrorAxis}>{copy.hideAxis}</button>
                </div>
                <div className="productivity-actions mirror-axis-actions">
                  <button disabled={!canTransform} onClick={onMirrorAtCustomAxis}>{copy.flipCustom}</button>
                  <button disabled={!canTransform} onClick={onMirrorCopyAtCustomAxis}>{copy.mirrorCopyCustom}</button>
                </div>
              </>
            )}
          </div>
"""
marker = """          </div>
        </div>

        <div className="productivity-block">
          <strong>{copy.repeat}</strong>"""
replace_once(
    "src/editor/ProductivityPanel.tsx",
    marker,
    "          </div>\n" + custom_controls + """        </div>

        <div className="productivity-block">
          <strong>{copy.repeat}</strong>""",
    "ProductivityPanel custom controls",
)

replace_once(
    "src/App.tsx",
    "import { GuideAttachmentPanel } from './editor/GuideAttachmentPanel'\n",
    "import { GuideAttachmentPanel } from './editor/GuideAttachmentPanel'\nimport { MirrorAxisOverlay, type MirrorAxisState } from './editor/MirrorAxisOverlay'\n",
    "App overlay import",
)
replace_once(
    "src/App.tsx",
    "import { createMirroredCopy } from './editor/mirrorCopy'\n",
    "import { createMirroredCopy, createMirroredCopyAroundAxis } from './editor/mirrorCopy'\n",
    "App mirror copy import",
)
replace_once(
    "src/App.tsx",
    "  mirrorElements,\n  repeatSelection,\n  ungroupElements,",
    "  mirrorElements,\n  mirrorElementsAroundAxis,\n  repeatSelection,\n  selectionPivot,\n  ungroupElements,",
    "App productivity imports",
)
replace_once(
    "src/App.tsx",
    "  const [pan, setPan] = useState<PanState | null>(null)\n",
    "  const [pan, setPan] = useState<PanState | null>(null)\n  const [mirrorAxis, setMirrorAxis] = useState<MirrorAxisState | null>(null)\n",
    "App mirror state",
)
replace_once(
    "src/App.tsx",
    "  const selectedParametricRow = useMemo(\n",
    "  useEffect(() => {\n    if (!selectedIds.length) setMirrorAxis(null)\n  }, [selectedIds.length])\n\n  const selectedParametricRow = useMemo(\n",
    "App clear mirror axis",
)

custom_functions = """  const configureMirrorAxis = useCallback((axis: MirrorAxis) => {
    const ids = productivitySelectionIds()
    const pivot = selectionPivot(elements, ids)
    if (!pivot) return
    const coordinate = axis === 'left-right' ? pivot.x : pivot.y
    setMirrorAxis((current) => current?.axis === axis ? current : { axis, coordinate })
    setStatus(locale === 'ru'
      ? axis === 'left-right' ? 'Вертикальная ось зеркалирования активна' : 'Горизонтальная ось зеркалирования активна'
      : axis === 'left-right' ? 'Vertical mirror axis active' : 'Horizontal mirror axis active')
  }, [elements, locale, productivitySelectionIds])

  const moveMirrorAxis = useCallback((coordinate: number) => {
    if (!Number.isFinite(coordinate)) return
    setMirrorAxis((current) => current ? { ...current, coordinate } : current)
  }, [])

  const centerMirrorAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    const pivot = selectionPivot(elements, ids)
    if (!pivot) return
    setMirrorAxis({ ...mirrorAxis, coordinate: mirrorAxis.axis === 'left-right' ? pivot.x : pivot.y })
  }, [elements, mirrorAxis, productivitySelectionIds])

  const mirrorSelectionAroundCustomAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    if (!ids.length) return
    duplicateSeriesRef.current = null
    commitElements(mirrorElementsAroundAxis(elements, ids, mirrorAxis.axis, mirrorAxis.coordinate))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? `Отражено по пользовательской оси: ${ids.length}` : `Flipped across custom axis: ${ids.length}`)
  }, [commitElements, elements, locale, mirrorAxis, productivitySelectionIds])

  const mirrorCopySelectionAroundCustomAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    if (!ids.length) return
    const created = createMirroredCopyAroundAxis(elements, ids, mirrorAxis.axis, mirrorAxis.coordinate, createId)
    if (!created.length) return
    duplicateSeriesRef.current = null
    commitElements([...elements, ...created])
    setSelectedIds(created.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(locale === 'ru' ? `Создана копия через пользовательскую ось: ${created.length}` : `Custom-axis mirrored copy created: ${created.length}`)
  }, [commitElements, elements, locale, mirrorAxis, productivitySelectionIds])

"""
replace_once(
    "src/App.tsx",
    "  const repeatProductivitySelection = useCallback((options: RepeatOptions) => {\n",
    custom_functions + "  const repeatProductivitySelection = useCallback((options: RepeatOptions) => {\n",
    "App custom mirror functions",
)
replace_once(
    "src/App.tsx",
    "        setMarquee(null)\n        snapLockRef.current = null",
    "        setMarquee(null)\n        setMirrorAxis(null)\n        snapLockRef.current = null",
    "App Escape hides axis",
)
overlay = """            {mirrorAxis && productivitySelectionIds().length > 0 && (
              <MirrorAxisOverlay
                state={mirrorAxis}
                elements={elements}
                selectedIds={productivitySelectionIds()}
                zoom={viewport.zoom}
                clientToDocument={clientToDocument}
                onChange={moveMirrorAxis}
              />
            )}

"""
replace_once(
    "src/App.tsx",
    "            <StitchLayer\n",
    overlay + "            <StitchLayer\n",
    "App mirror overlay",
)
replace_once(
    "src/App.tsx",
    "            onMirror={mirrorSelection}\n            onMirrorCopy={mirrorCopySelection}\n            onRepeat={repeatProductivitySelection}",
    "            onMirror={mirrorSelection}\n"
    "            onMirrorCopy={mirrorCopySelection}\n"
    "            mirrorAxis={mirrorAxis}\n"
    "            onConfigureMirrorAxis={configureMirrorAxis}\n"
    "            onMirrorAxisCoordinateChange={moveMirrorAxis}\n"
    "            onCenterMirrorAxis={centerMirrorAxis}\n"
    "            onHideMirrorAxis={() => setMirrorAxis(null)}\n"
    "            onMirrorAtCustomAxis={mirrorSelectionAroundCustomAxis}\n"
    "            onMirrorCopyAtCustomAxis={mirrorCopySelectionAroundCustomAxis}\n"
    "            onRepeat={repeatProductivitySelection}",
    "App ProductivityPanel props",
)

replace_once(
    "src/i18n.ts",
    "brandSubtitle: 'Векторный редактор схем · v1.11'",
    "brandSubtitle: 'Векторный редактор схем · v1.11.1'",
    "RU version",
)
replace_once(
    "src/i18n.ts",
    "brandSubtitle: 'Vector crochet chart editor · v1.11'",
    "brandSubtitle: 'Vector crochet chart editor · v1.11.1'",
    "EN version",
)

Path(".github/workflows/apply-custom-mirror-axis.yml").unlink(missing_ok=True)
Path("scripts/apply_custom_mirror_axis.py").unlink(missing_ok=True)

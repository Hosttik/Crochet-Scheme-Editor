from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


app_path = Path('src/App.tsx')
text = app_path.read_text()

text = replace_once(
    text,
    "import { RowMarkersPanel } from './editor/RowMarkersPanel'\n",
    "import { RowMarkersPanel } from './editor/RowMarkersPanel'\nimport { LassoOverlay, type LassoMode } from './editor/LassoOverlay'\n",
    'lasso import',
)
text = replace_once(
    text,
    "  idsInMarquee,\n  normalizeRect,\n",
    "  idsInLasso,\n  idsInMarquee,\n  normalizeRect,\n",
    'selection import',
)
text = replace_once(
    text,
    "type Tool = { type: 'select' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }\n",
    "type Tool = { type: 'select' } | { type: 'lasso' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }\n",
    'tool type',
)
text = replace_once(
    text,
    "type MarqueeState = {\n  pointerId: number\n  start: Point\n  current: Point\n  baseIds: string[]\n}\n",
    "type MarqueeState = {\n  pointerId: number\n  start: Point\n  current: Point\n  baseIds: string[]\n}\ntype LassoState = {\n  pointerId: number\n  points: Point[]\n  baseIds: string[]\n  mode: LassoMode\n}\n",
    'lasso state type',
)
text = replace_once(
    text,
    "  const [marquee, setMarquee] = useState<MarqueeState | null>(null)\n  const [rotate, setRotate] = useState<RotateState | null>(null)\n",
    "  const [marquee, setMarquee] = useState<MarqueeState | null>(null)\n  const [lasso, setLasso] = useState<LassoState | null>(null)\n  const [rotate, setRotate] = useState<RotateState | null>(null)\n",
    'lasso state',
)
text = replace_once(
    text,
    "        } else if (event.key.toLowerCase() === 's') {\n          event.preventDefault()\n          toggleSnapping()\n        }\n",
    "        } else if (event.key.toLowerCase() === 's') {\n          event.preventDefault()\n          toggleSnapping()\n        } else if (event.key.toLowerCase() === 'l') {\n          event.preventDefault()\n          setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })\n          setLasso(null)\n          setPreview(null)\n          setSnapTarget(null)\n          setSelectedGuideId(null)\n          setSelectedRowMarkerId(null)\n        }\n",
    'lasso hotkey',
)
text = replace_once(
    text,
    "        setRotate(null)\n        setMarquee(null)\n        setMirrorAxis(null)\n",
    "        setRotate(null)\n        setMarquee(null)\n        setLasso(null)\n        setMirrorAxis(null)\n",
    'escape lasso',
)
text = replace_once(
    text,
    "    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n    if (tool.type === 'row-marker') {\n",
    "    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n    if (tool.type === 'lasso') {\n      event.currentTarget.setPointerCapture(event.pointerId)\n      setSelectedGuideId(null)\n      setSelectedRowMarkerId(null)\n      setLasso({\n        pointerId: event.pointerId,\n        points: [point],\n        baseIds: [...selectedIds],\n        mode: event.altKey ? 'subtract' : event.shiftKey ? 'add' : 'replace',\n      })\n      return\n    }\n    if (tool.type === 'row-marker') {\n",
    'lasso pointer down',
)
text = replace_once(
    text,
    "    if (marquee?.pointerId === event.pointerId) {\n      setMarquee({ ...marquee, current: documentPoint })\n      return\n    }\n\n    updatePreview(documentPoint)\n",
    "    if (lasso?.pointerId === event.pointerId) {\n      const last = lasso.points.at(-1)\n      if (!last || Math.hypot(documentPoint.x - last.x, documentPoint.y - last.y) >= 3 / viewport.zoom) {\n        setLasso({ ...lasso, points: [...lasso.points, documentPoint] })\n      }\n      return\n    }\n\n    if (marquee?.pointerId === event.pointerId) {\n      setMarquee({ ...marquee, current: documentPoint })\n      return\n    }\n\n    updatePreview(documentPoint)\n",
    'lasso pointer move',
)
text = replace_once(
    text,
    "    if (marquee?.pointerId === event.pointerId) {\n      if (!cancelled) {\n",
    "    if (lasso?.pointerId === event.pointerId) {\n      if (!cancelled && lasso.points.length >= 3) {\n        const selectable = elements.filter(\n          (element) => isElementVisible(element) && !isElementLocked(element),\n        )\n        const hits = idsInLasso(selectable, lasso.points)\n        const expandedHits = expandIdsToGroups(\n          elements,\n          expandIdsToParametricRows(elements, hits),\n        )\n        const hitSet = new Set(expandedHits)\n        const next = lasso.mode === 'subtract'\n          ? lasso.baseIds.filter((id) => !hitSet.has(id))\n          : lasso.mode === 'add'\n            ? uniqueIds([...lasso.baseIds, ...expandedHits])\n            : expandedHits\n        setSelectedIds(next)\n        setStatus(next.length\n          ? `${locale === 'ru' ? 'Выбрано лассо' : 'Lasso selected'}: ${next.length}`\n          : locale === 'ru' ? 'Лассо: ничего не выбрано' : 'Lasso: nothing selected')\n      }\n      setLasso(null)\n      return\n    }\n\n    if (marquee?.pointerId === event.pointerId) {\n      if (!cancelled) {\n",
    'lasso finish',
)
text = replace_once(
    text,
    "          <button\n            className={`tool-button ${tool.type === 'select' ? 'active' : ''}`}\n            onClick={() => {\n              setTool({ type: 'select' })\n              setPreview(null)\n              setSnapTarget(null)\n            }}\n          >\n            <span>↖</span>{t.selectMove}<kbd>Esc</kbd>\n          </button>\n          <small className=\"muted-text\">{locale === 'ru' ? 'Space + перетаскивание — временная «ладонь»' : 'Space + drag — temporary hand/pan'}</small>\n",
    "          <button\n            className={`tool-button ${tool.type === 'select' ? 'active' : ''}`}\n            onClick={() => {\n              setTool({ type: 'select' })\n              setLasso(null)\n              setPreview(null)\n              setSnapTarget(null)\n            }}\n          >\n            <span>↖</span>{t.selectMove}<kbd>Esc</kbd>\n          </button>\n          <button\n            className={`tool-button ${tool.type === 'lasso' ? 'active' : ''}`}\n            aria-label={locale === 'ru' ? 'Лассо' : 'Lasso'}\n            onClick={() => {\n              setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })\n              setLasso(null)\n              setPreview(null)\n              setSnapTarget(null)\n              setSelectedGuideId(null)\n              setSelectedRowMarkerId(null)\n            }}\n          >\n            <span>⌁</span>{locale === 'ru' ? 'Лассо' : 'Lasso'}<kbd>L</kbd>\n          </button>\n          <small className=\"muted-text\">{locale === 'ru' ? 'Лассо: Shift добавить · Alt вычесть · Space + drag — ладонь' : 'Lasso: Shift add · Alt subtract · Space + drag — hand'}</small>\n",
    'lasso tool button',
)
text = replace_once(
    text,
    "          <button\n            className={`snap-toggle ${snapping.enabled ? 'active' : ''}`}\n",
    "          <button\n            className={`fit-button ${tool.type === 'lasso' ? 'active' : ''}`}\n            aria-label={locale === 'ru' ? 'Лассо' : 'Lasso'}\n            aria-pressed={tool.type === 'lasso'}\n            title=\"L\"\n            onClick={() => {\n              setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })\n              setLasso(null)\n              setPreview(null)\n              setSnapTarget(null)\n              setSelectedGuideId(null)\n              setSelectedRowMarkerId(null)\n            }}\n          >{locale === 'ru' ? 'Лассо' : 'Lasso'}</button>\n          <button\n            className={`snap-toggle ${snapping.enabled ? 'active' : ''}`}\n",
    'lasso toolbar button',
)
text = replace_once(
    text,
    "          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'place' ? 'placing' : 'selecting'}`}\n",
    "          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'place' ? 'placing' : tool.type === 'lasso' ? 'lassoing' : 'selecting'}`}\n",
    'canvas lasso class',
)
text = replace_once(
    text,
    "            {snapTarget && (\n              <g className={`snap-indicator ${snapTarget.targetType === 'guide' ? 'guide-target' : ''}`} transform={`translate(${snapTarget.point.x} ${snapTarget.point.y})`}>\n                <circle r={8 / viewport.zoom} vectorEffect=\"non-scaling-stroke\" />\n                <circle r={2.5 / viewport.zoom} vectorEffect=\"non-scaling-stroke\" />\n              </g>\n            )}\n          </g>\n",
    "            {snapTarget && (\n              <g className={`snap-indicator ${snapTarget.targetType === 'guide' ? 'guide-target' : ''}`} transform={`translate(${snapTarget.point.x} ${snapTarget.point.y})`}>\n                <circle r={8 / viewport.zoom} vectorEffect=\"non-scaling-stroke\" />\n                <circle r={2.5 / viewport.zoom} vectorEffect=\"non-scaling-stroke\" />\n              </g>\n            )}\n\n            {tool.type === 'lasso' && (\n              <LassoOverlay\n                points={lasso?.points ?? []}\n                zoom={viewport.zoom}\n                mode={lasso?.mode ?? 'replace'}\n              />\n            )}\n          </g>\n",
    'lasso overlay render',
)

app_path.write_text(text)

# Version strings / docs.
package_path = Path('package.json')
package_text = package_path.read_text().replace('"version": "1.14.0"', '"version": "1.15.0"', 1)
package_path.write_text(package_text)

lock_path = Path('package-lock.json')
lock_text = lock_path.read_text().replace('"version": "1.14.0"', '"version": "1.15.0"', 2)
lock_path.write_text(lock_text)

i18n_path = Path('src/i18n.ts')
i18n_text = i18n_path.read_text().replace('Векторный редактор схем · v1.14', 'Векторный редактор схем · v1.15').replace('Crochet chart editor · v1.14', 'Crochet chart editor · v1.15')
i18n_path.write_text(i18n_text)

readme_path = Path('README.md')
readme = readme_path.read_text()
readme = readme.replace('## v1.14.0', '## v1.15.0', 1)
readme = readme.replace('v1.14 adds persisted tracing underlays and page-tiled print output.', 'v1.14 adds persisted tracing underlays and page-tiled print output; v1.15 completes the original interaction backlog with free-form lasso selection.', 1)
needle = '### Editing and productivity\n\n'
if needle in readme and 'free-form lasso selection' not in readme.split(needle, 1)[1][:500]:
    readme = readme.replace(needle, needle + '- free-form lasso selection uses a drawn polygon; Shift adds to the current semantic selection and Alt subtracts from it, while groups and parametric rows expand as whole authoring objects\n', 1)
readme = readme.replace('The next larger interaction milestone is free-form lasso selection. A future color-domain milestone', 'The original 25-item usability backlog is now functionally covered. A future color-domain milestone', 1)
readme_path.write_text(readme)

from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'Expected snippet not found in {path}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/editor/projectSchema.ts',
    """    !(value.profileId === undefined || nonEmptyString(value.profileId)) ||\n    !(value.manualStitchCount === undefined || positiveInteger(value.manualStitchCount, MAX_PROJECT_ELEMENTS))\n""",
    """    !(value.profileId === undefined || nonEmptyString(value.profileId)) ||\n    !(value.mode === undefined || value.mode === 'stitches' || value.mode === 'rows') ||\n    !(value.manualStitchCount === undefined || positiveInteger(value.manualStitchCount, MAX_PROJECT_ELEMENTS)) ||\n    !(value.manualRowCount === undefined || positiveInteger(value.manualRowCount, MAX_PROJECT_ELEMENTS))\n""",
)
replace_once(
    'src/editor/projectSchema.ts',
    """    profileId: value.profileId as string | undefined,\n    manualStitchCount: value.manualStitchCount as number | undefined,\n""",
    """    profileId: value.profileId as string | undefined,\n    mode: value.mode as 'stitches' | 'rows' | undefined,\n    manualStitchCount: value.manualStitchCount as number | undefined,\n    manualRowCount: value.manualRowCount as number | undefined,\n""",
)

replace_once(
    'src/editor/projectIntegrity.ts',
    """    if (ruler.manualStitchCount !== undefined && !positiveInteger(ruler.manualStitchCount, MAX_PROJECT_ELEMENTS)) return 'Measurement ruler stitch count is out of bounds'\n    if (strictReferences && ruler.profileId && !gaugeProfileIds.has(ruler.profileId)) return 'Measurement ruler gauge profile is missing'\n""",
    """    if (ruler.mode !== undefined && ruler.mode !== 'stitches' && ruler.mode !== 'rows') return 'Measurement ruler mode is invalid'\n    if (ruler.manualStitchCount !== undefined && !positiveInteger(ruler.manualStitchCount, MAX_PROJECT_ELEMENTS)) return 'Measurement ruler stitch count is out of bounds'\n    if (ruler.manualRowCount !== undefined && !positiveInteger(ruler.manualRowCount, MAX_PROJECT_ELEMENTS)) return 'Measurement ruler row count is out of bounds'\n    if (strictReferences && ruler.profileId && !gaugeProfileIds.has(ruler.profileId)) return 'Measurement ruler gauge profile is missing'\n""",
)

panel = Path('src/editor/GaugeRulerPanel.tsx')
text = panel.read_text()
text = text.replace(
    """        <small className=\"muted-text\">\n          {ru\n            ? 'Две точки. Концы автоматически прилипают к петлям; на одном ряду число петель считается само.'\n            : 'Pick two points. Endpoints snap to stitches; on one row the stitch count is automatic.'}\n        </small>\n""",
    """        <small className=\"muted-text\">\n          {ru\n            ? 'Две точки. В режиме петель считаются петли одного ряда; в режиме рядов — семантические ряды между точками.'\n            : 'Pick two points. Stitch mode counts one row; row mode counts semantic rows between endpoints.'}\n        </small>\n""",
)
old_block = """        {selectedRuler && (\n          <div className=\"ruler-editor\">\n            <strong>{ru ? 'Выбранная линейка' : 'Selected ruler'}</strong>\n            <label className=\"gauge-field\">\n              <span>{ru ? 'Образец для расчёта' : 'Gauge swatch'}</span>\n              <select\n                aria-label={ru ? 'Образец линейки' : 'Ruler gauge swatch'}\n                value={selectedRuler.profileId ?? ''}\n                onChange={(event) => onUpdateRuler(selectedRuler.id, { profileId: event.target.value || undefined })}\n              >\n                <option value=\"\">{ru ? 'Активный образец' : 'Active swatch'}</option>\n                {gauge.profiles.map((profile) => (\n                  <option key={profile.id} value={profile.id}>{profile.name}</option>\n                ))}\n              </select>\n            </label>\n            <label className=\"gauge-field\">\n              <span>{ru ? 'Петель вручную (0 = авто)' : 'Manual stitches (0 = auto)'}</span>\n              <DraftNumberInput\n                value={selectedRuler.manualStitchCount ?? 0}\n                min={0}\n                max={20000}\n                step={1}\n                commitOnBlur\n                ariaLabel={ru ? 'Петель линейки вручную' : 'Manual ruler stitch count'}\n                onChange={(value) => onUpdateRuler(selectedRuler.id, {\n                  manualStitchCount: value > 0 ? Math.round(value) : undefined,\n                })}\n              />\n            </label>\n            {(() => {\n              const estimate = rulerEstimate(selectedRuler, elements, gauge)\n              if (estimate.source === 'automatic' && estimate.stitchCount) {\n                return <small>{ru ? `Автоматически по ряду: ${estimate.stitchCount} петель` : `Automatic from row: ${estimate.stitchCount} stitches`}</small>\n              }\n              if (estimate.source === 'manual' && estimate.stitchCount) {\n                return <small>{ru ? `Ручной расчёт: ${estimate.stitchCount} петель` : `Manual count: ${estimate.stitchCount} stitches`}</small>\n              }\n              return <small>{ru ? 'Для свободной линейки укажите число петель вручную.' : 'For a free ruler, enter the stitch count manually.'}</small>\n            })()}\n            <button className=\"danger-button\" onClick={() => onDeleteRuler(selectedRuler.id)}>\n              {ru ? 'Удалить линейку' : 'Delete ruler'}\n            </button>\n          </div>\n        )}\n"""
new_block = """        {selectedRuler && (\n          <div className=\"ruler-editor\">\n            <strong>{ru ? 'Выбранная линейка' : 'Selected ruler'}</strong>\n            <label className=\"gauge-field\">\n              <span>{ru ? 'Тип измерения' : 'Measurement type'}</span>\n              <select\n                aria-label={ru ? 'Тип измерения' : 'Measurement type'}\n                value={selectedRuler.mode ?? 'stitches'}\n                onChange={(event) => onUpdateRuler(selectedRuler.id, {\n                  mode: event.target.value as 'stitches' | 'rows',\n                })}\n              >\n                <option value=\"stitches\">{ru ? 'Петли → ширина' : 'Stitches → width'}</option>\n                <option value=\"rows\">{ru ? 'Ряды → высота' : 'Rows → height'}</option>\n              </select>\n            </label>\n            <label className=\"gauge-field\">\n              <span>{ru ? 'Образец для расчёта' : 'Gauge swatch'}</span>\n              <select\n                aria-label={ru ? 'Образец линейки' : 'Ruler gauge swatch'}\n                value={selectedRuler.profileId ?? ''}\n                onChange={(event) => onUpdateRuler(selectedRuler.id, { profileId: event.target.value || undefined })}\n              >\n                <option value=\"\">{ru ? 'Активный образец' : 'Active swatch'}</option>\n                {gauge.profiles.map((profile) => (\n                  <option key={profile.id} value={profile.id}>{profile.name}</option>\n                ))}\n              </select>\n            </label>\n            {(selectedRuler.mode ?? 'stitches') === 'rows' ? (\n              <label className=\"gauge-field\">\n                <span>{ru ? 'Рядов вручную (0 = авто)' : 'Manual rows (0 = auto)'}</span>\n                <DraftNumberInput\n                  value={selectedRuler.manualRowCount ?? 0}\n                  min={0}\n                  max={20000}\n                  step={1}\n                  commitOnBlur\n                  ariaLabel={ru ? 'Рядов линейки вручную' : 'Manual ruler row count'}\n                  onChange={(value) => onUpdateRuler(selectedRuler.id, {\n                    manualRowCount: value > 0 ? Math.round(value) : undefined,\n                  })}\n                />\n              </label>\n            ) : (\n              <label className=\"gauge-field\">\n                <span>{ru ? 'Петель вручную (0 = авто)' : 'Manual stitches (0 = auto)'}</span>\n                <DraftNumberInput\n                  value={selectedRuler.manualStitchCount ?? 0}\n                  min={0}\n                  max={20000}\n                  step={1}\n                  commitOnBlur\n                  ariaLabel={ru ? 'Петель линейки вручную' : 'Manual ruler stitch count'}\n                  onChange={(value) => onUpdateRuler(selectedRuler.id, {\n                    manualStitchCount: value > 0 ? Math.round(value) : undefined,\n                  })}\n                />\n              </label>\n            )}\n            {(() => {\n              const estimate = rulerEstimate(selectedRuler, elements, gauge)\n              if (estimate.mode === 'rows') {\n                if (estimate.source === 'automatic' && estimate.rowCount) {\n                  return <small>{ru ? `Автоматически между рядами: ${estimate.rowCount} рядов` : `Automatic between rows: ${estimate.rowCount} rows`}</small>\n                }\n                if (estimate.source === 'manual' && estimate.rowCount) {\n                  return <small>{ru ? `Ручной расчёт: ${estimate.rowCount} рядов` : `Manual count: ${estimate.rowCount} rows`}</small>\n                }\n                return <small>{ru ? 'Привяжите точки к параметрическим рядам или укажите число рядов вручную.' : 'Snap endpoints to parametric rows or enter the row count manually.'}</small>\n              }\n              if (estimate.source === 'automatic' && estimate.stitchCount) {\n                return <small>{ru ? `Автоматически по ряду: ${estimate.stitchCount} петель` : `Automatic from row: ${estimate.stitchCount} stitches`}</small>\n              }\n              if (estimate.source === 'manual' && estimate.stitchCount) {\n                return <small>{ru ? `Ручной расчёт: ${estimate.stitchCount} петель` : `Manual count: ${estimate.stitchCount} stitches`}</small>\n              }\n              return <small>{ru ? 'Для свободной линейки укажите число петель вручную.' : 'For a free ruler, enter the stitch count manually.'}</small>\n            })()}\n            <button className=\"danger-button\" onClick={() => onDeleteRuler(selectedRuler.id)}>\n              {ru ? 'Удалить линейку' : 'Delete ruler'}\n            </button>\n          </div>\n        )}\n"""
if old_block not in text:
    raise SystemExit('Selected ruler panel block not found')
panel.write_text(text.replace(old_block, new_block, 1))

replace_once(
    'src/editor/gauge.test.ts',
    """  patternHeightEstimateCm,\n  rowLengthEstimateCm,\n""",
    """  patternHeightEstimateCm,\n  rowHeightCm,\n  rowLengthEstimateCm,\n""",
)
replace_once(
    'src/editor/gauge.test.ts',
    """    expect(stitchWidthCm(profile)).toBe(0.5)\n    expect(rowLengthEstimateCm(elements, 'row-1', profile)).toBe(2)\n""",
    """    expect(stitchWidthCm(profile)).toBe(0.5)\n    expect(rowHeightCm(profile)).toBeCloseTo(10 / 24, 8)\n    expect(rowLengthEstimateCm(elements, 'row-1', profile)).toBe(2)\n""",
)
replace_once(
    'src/editor/gauge.test.ts',
    """  it('uses an explicit manual stitch count for a free ruler', () => {\n""",
    """  it('counts inclusive semantic rows automatically between two parametric rows', () => {\n    const ruler: MeasurementRuler = {\n      id: 'rows-1',\n      start: { x: 0, y: 40 },\n      end: { x: 0, y: 80 },\n      startElementId: 'a',\n      endElementId: 'e',\n      mode: 'rows',\n    }\n    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({\n      mode: 'rows',\n      rowCount: 2,\n      lengthCm: 20 / 24,\n      source: 'automatic',\n      startRowId: 'row-1',\n      endRowId: 'row-2',\n    })\n  })\n\n  it('uses an explicit manual row count for a free vertical ruler', () => {\n    const ruler: MeasurementRuler = {\n      id: 'rows-2',\n      start: { x: 0, y: 0 },\n      end: { x: 0, y: 100 },\n      mode: 'rows',\n      manualRowCount: 6,\n    }\n    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({\n      mode: 'rows',\n      rowCount: 6,\n      lengthCm: 2.5,\n      source: 'manual',\n    })\n  })\n\n  it('uses an explicit manual stitch count for a free ruler', () => {\n""",
)

replace_once(
    'src/editor/gaugeSchema.test.ts',
    """      rulers: [{ id: 'r1', start: { x: 1, y: 2 }, end: { x: 30, y: 2 }, profileId: 'g1', manualStitchCount: 10 }],\n""",
    """      rulers: [\n        { id: 'r1', start: { x: 1, y: 2 }, end: { x: 30, y: 2 }, profileId: 'g1', manualStitchCount: 10 },\n        { id: 'r2', start: { x: 1, y: 2 }, end: { x: 1, y: 30 }, profileId: 'g1', mode: 'rows', manualRowCount: 4 },\n      ],\n""",
)
replace_once(
    'src/editor/gaugeSchema.test.ts',
    """    expect(parsed.rulers?.[0]).toMatchObject({ id: 'r1', manualStitchCount: 10 })\n""",
    """    expect(parsed.rulers?.[0]).toMatchObject({ id: 'r1', manualStitchCount: 10 })\n    expect(parsed.rulers?.[1]).toMatchObject({ id: 'r2', mode: 'rows', manualRowCount: 4 })\n""",
)
replace_once(
    'src/editor/gaugeSchema.test.ts',
    """  it('rejects invalid gauge values in current schema', () => {\n""",
    """  it('rejects an invalid ruler measurement mode', () => {\n    expect(() => parseProject({\n      ...base(19),\n      rulers: [{ id: 'r1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, mode: 'pixels' }],\n    }, snapping)).toThrow(ProjectValidationError)\n  })\n\n  it('rejects invalid gauge values in current schema', () => {\n""",
)

replace_once(
    'e2e/gaugeRuler.e2e.ts',
    """  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')\n\n  const downloadPromise = page.waitForEvent('download')\n""",
    """  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')\n\n  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()\n  await expect(page.locator('.stitch-element')).toHaveCount(24)\n\n  await gauge.getByRole('button', { name: 'Поставить линейку' }).click()\n  await page.locator('.stitch-element').nth(0).click()\n  await page.locator('.stitch-element').nth(12).click()\n  await gauge.getByLabel('Тип измерения').selectOption('rows')\n\n  await expect(page.locator('.measurement-ruler')).toHaveCount(2)\n  const rowRuler = page.locator('.measurement-ruler').nth(1)\n  await expect(rowRuler.locator('.ruler-label')).toContainText('2 р.')\n  await expect(rowRuler.locator('.ruler-label')).toContainText('≈ 0,8 см')\n  await expect(gauge).toContainText('Автоматически между рядами: 2 рядов')\n\n  const downloadPromise = page.waitForEvent('download')\n""",
)
replace_once(
    'e2e/gaugeRuler.e2e.ts',
    """  expect(project.rulers).toHaveLength(1)\n  expect(project.rulers[0].startElementId).toBeTruthy()\n  expect(project.rulers[0].endElementId).toBeTruthy()\n""",
    """  expect(project.rulers).toHaveLength(2)\n  expect(project.rulers[0].startElementId).toBeTruthy()\n  expect(project.rulers[0].endElementId).toBeTruthy()\n  expect(project.rulers[1]).toMatchObject({ mode: 'rows' })\n  expect(project.rulers[1].startElementId).toBeTruthy()\n  expect(project.rulers[1].endElementId).toBeTruthy()\n""",
)
replace_once(
    'e2e/gaugeRuler.e2e.ts',
    """  await expect(page.locator('.measurement-ruler')).toHaveCount(1)\n  await expect(page.locator('.measurement-ruler .ruler-label')).toContainText('≈ 6 см')\n""",
    """  await expect(page.locator('.measurement-ruler')).toHaveCount(2)\n  await expect(page.locator('.measurement-ruler').first().locator('.ruler-label')).toContainText('≈ 6 см')\n  await expect(page.locator('.measurement-ruler').nth(1).locator('.ruler-label')).toContainText('2 р.')\n""",
)

print('Row-height ruler follow-up applied')

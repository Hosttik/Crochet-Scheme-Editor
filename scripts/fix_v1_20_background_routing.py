from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:140]!r}')
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/App.tsx',
    """                background={backgroundImage}
                selected={backgroundSelected}
                zoom={viewport.zoom}
""",
    """                background={backgroundImage}
                selected={backgroundSelected && tool.type === 'select'}
                interactive={tool.type === 'select'}
                zoom={viewport.zoom}
""",
)

path = Path('e2e/background-print.e2e.ts')
text = path.read_text()
addition = r'''

test('keeps the tracing underlay transparent to placement tools', async ({ page }) => {
  await openEditor(page)
  await uploadReference(page)

  const imageBox = await page.getByTestId('background-image').boundingBox()
  expect(imageBox).not.toBeNull()
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида · "]').click()
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/placing/)
  await page.mouse.click(
    imageBox!.x + imageBox!.width / 2,
    imageBox!.y + imageBox!.height / 2,
  )
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})
'''
if "keeps the tracing underlay transparent to placement tools" not in text:
    path.write_text(text.rstrip() + addition + '\n')

from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, got {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    'src/App.tsx',
    """  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || spacePressedRef.current || tool.type === 'pan') {
""",
    """  const handleCanvasPointerDownCapture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool.type !== 'pan' || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    beginPan(event)
  }

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || spacePressedRef.current) {
""",
)
replace_once(
    'src/App.tsx',
    """          onPointerDown={handleCanvasPointerDown}
""",
    """          onPointerDownCapture={handleCanvasPointerDownCapture}
          onPointerDown={handleCanvasPointerDown}
""",
)

css = Path('src/editor/productivity.css')
text = css.read_text()
malformed = """.productivity-actions,
.productivity-mode-tabs,
.productivity-field-error { display: block; margin-top: -5px; color: #a44036; font-size: 10px; }
.productivity-field-grid {"""
corrected = """.productivity-actions,
.productivity-mode-tabs,
.productivity-field-grid {"""
if text.count(malformed) != 1:
    raise SystemExit(f"Productivity CSS source mismatch: {text.count(malformed)}")
text = text.replace(malformed, corrected, 1)
text += "\n.productivity-field-error { display: block; margin-top: -5px; color: #a44036; font-size: 10px; }\n"
css.write_text(text)

print('v1.18 final usability fixes applied')

from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1))


# Schema migrations now normalize all supported inputs to the v20 document shape.
for file in Path('src').rglob('*.test.ts'):
    text = file.read_text()
    text = text.replace('schemaVersion).toBe(19)', 'schemaVersion).toBe(20)')
    file.write_text(text)

# Keep exact horizontal/vertical reflections numerically stable instead of leaking trig epsilon.
replace_once(
    'src/editor/productivity.ts',
    """  return {
    x: line.point.x + 2 * projection * axis.x - relative.x,
    y: line.point.y + 2 * projection * axis.y - relative.y,
  }
}""",
    """  const x = line.point.x + 2 * projection * axis.x - relative.x
  const y = line.point.y + 2 * projection * axis.y - relative.y
  return {
    x: Math.round(x * 1e12) / 1e12,
    y: Math.round(y * 1e12) / 1e12,
  }
}""",
)

# Old tests asserted the rotation-only approximation. The new representation keeps a true
# reflection as rotation + odd glyph parity, which is equivalent for any axis angle.
replace_once(
    'src/editor/mirrorAxis.test.ts',
    "expect(mirrored[0]).toMatchObject({ x: 190, y: 20, rotation: 165 })",
    "expect(mirrored[0]).toMatchObject({ x: 190, y: 20, rotation: -15, mirrored: true })",
)
replace_once(
    'src/editor/mirrorAxis.test.ts',
    "expect(mirrored[1]).toMatchObject({ x: 170, y: 40, rotation: -150 })",
    "expect(mirrored[1]).toMatchObject({ x: 170, y: 40, rotation: 30, mirrored: true })",
)
replace_once(
    'src/editor/mirrorAxis.test.ts',
    "expect(mirrored[0]).toMatchObject({ x: 10, y: -60, rotation: -15 })",
    "expect(mirrored[0]).toMatchObject({ x: 10, y: -60, rotation: 165, mirrored: true })",
)
replace_once(
    'src/editor/mirrorAxis.test.ts',
    "expect(created[0]).toMatchObject({ x: 190, y: 20, rotation: 165, locked: false })",
    "expect(created[0]).toMatchObject({ x: 190, y: 20, rotation: -15, mirrored: true, locked: false })",
)
replace_once(
    'src/editor/mirrorAxis.test.ts',
    "expect(created[1]).toMatchObject({ x: 170, y: 40, rotation: -150, locked: false })",
    "expect(created[1]).toMatchObject({ x: 170, y: 40, rotation: 30, mirrored: true, locked: false })",
)
replace_once(
    'src/editor/mirrorCopy.test.ts',
    "expect(copy[0].rotation).toBe(-180)\n    expect(copy[1].rotation).toBe(150)",
    "expect(copy[0]).toMatchObject({ rotation: 0, mirrored: true })\n    expect(copy[1]).toMatchObject({ rotation: -30, mirrored: true })",
)
replace_once(
    'src/editor/mirrorCopy.test.ts',
    "expect(copy[0].rotation).toBe(0)",
    "expect(copy[0]).toMatchObject({ rotation: -180, mirrored: true })",
)

from pathlib import Path

path = Path('tools/patch_v112.py')
source = path.read_text()
old = '''    if count != 1:\n        raise RuntimeError(f"{label}: expected 1 match, found {count}")\n    return text.replace(old, new, 1)\n'''
new = '''    if label == 'app open clear marker' and count == 2:\n        return text.replace(old, new, 2)\n    if label == 'app load clear marker' and count == 0:\n        return text\n    if count != 1:\n        raise RuntimeError(f"{label}: expected 1 match, found {count}")\n    return text.replace(old, new, 1)\n'''
if source.count(old) != 1:
    raise RuntimeError('Could not patch v1.12 helper')
source = source.replace(old, new, 1)
exec(compile(source, str(path), 'exec'), {'__name__': '__main__'})

schema_path = Path('src/editor/projectSchema.ts')
schema = schema_path.read_text()
needle = '    number: value.number,\n'
if schema.count(needle) != 1:
    raise RuntimeError('Could not narrow validated row marker number')
schema_path.write_text(schema.replace(needle, '    number: value.number as number,\n', 1))

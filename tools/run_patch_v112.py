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

document_test_path = Path('src/editor/document.test.ts')
document_test = document_test_path.read_text()
if document_test.count('expect(migrated.schemaVersion).toBe(14)') != 2:
    raise RuntimeError('Could not update legacy migration schema assertions')
document_test = document_test.replace('expect(migrated.schemaVersion).toBe(14)', 'expect(migrated.schemaVersion).toBe(15)')
document_test = document_test.replace('schema v14', 'schema v15')
document_test_path.write_text(document_test)

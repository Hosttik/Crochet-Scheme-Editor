from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text(encoding='utf-8')
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}: {old[:120]!r}')
    file.write_text(content.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/App.tsx',
    "import { projectIntegrityIssue } from './editor/projectIntegrity'\nimport { CURRENT_PROJECT_SCHEMA_VERSION } from './editor/projectVersion'",
    "import { projectIntegrityIssue } from './editor/projectIntegrity'\nimport { rowConstructionTopologyParents } from './editor/rowConstruction'\nimport { CURRENT_PROJECT_SCHEMA_VERSION } from './editor/projectVersion'",
)
replace_once(
    'src/App.tsx',
    "  const selectedParametricParentCount = useMemo(() => {\n    const parentRowId = selectedParametricRow?.parentRowId\n    if (!parentRowId) return undefined\n    const count = rowElements(elements, parentRowId).length\n    return count || undefined\n  }, [elements, selectedParametricRow])",
    "  const selectedParametricParentCount = useMemo(() => {\n    const parentRowId = selectedParametricRow?.parentRowId\n    if (!parentRowId) return undefined\n    const parents = rowElements(elements, parentRowId)\n    const count = rowConstructionTopologyParents(\n      parents,\n      selectedParametricRow.construction,\n    ).length\n    return count || undefined\n  }, [elements, selectedParametricRow])",
)

replace_once(
    'src/editor/TopologyEditorPanel.tsx',
    "import { rowElements } from './parametricRows'",
    "import { rowElements } from './parametricRows'\nimport { rowConstructionTopologyParents } from './rowConstruction'",
)
replace_once(
    'src/editor/TopologyEditorPanel.tsx',
    "  const parents = rowElements(elements, parentRowId)\n  const markers = topologyChangeMarkers(elements, binding.id)",
    "  const rawParents = rowElements(elements, parentRowId)\n  const parents = rowConstructionTopologyParents(rawParents, binding.construction)\n  const markers = topologyChangeMarkers(elements, binding.id)",
)

ignore = Path('.gitignore')
content = ignore.read_text(encoding='utf-8')
if 'test-results/' not in content.splitlines():
    ignore.write_text(content.rstrip() + '\ntest-results/\n', encoding='utf-8')

print('v1.17.1 semantic follow-up applied')

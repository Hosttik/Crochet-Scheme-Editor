from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, old: str, new: str, count: int = 1) -> None:
    target = ROOT / path
    text = target.read_text()
    found = text.count(old)
    if found != count:
        raise RuntimeError(f'{path}: expected {count}, found {found}: {old[:100]!r}')
    target.write_text(text.replace(old, new))

patch(
    'src/editor/projectIntegrity.ts',
    "function bindingIssue(binding: ParametricRowBinding, guides: Map<string, Guide>) {\n  const guide = guides.get(binding.guideId)\n  if (!guide || (guide.type !== 'arc' && guide.type !== 'radial-grid')) return 'Parametric row references an incompatible guide'\n",
    "function bindingIssue(binding: ParametricRowBinding, guides: Map<string, Guide>, strictReferences: boolean) {\n  const guide = guides.get(binding.guideId)\n  if (guide && guide.type !== 'arc' && guide.type !== 'radial-grid') return 'Parametric row references an incompatible guide'\n  if (!guide && strictReferences) return 'Parametric row references an incompatible guide'\n",
)
patch(
    'src/editor/projectIntegrity.ts',
    "export function projectIntegrityIssue(project: CrochetProject): string | null {",
    "export function projectIntegrityIssue(project: CrochetProject, strictReferences = true): string | null {",
)
patch(
    'src/editor/projectIntegrity.ts',
    "    if (element.parentStitchIds?.some((id) => !elementIds.has(id))) return 'Stitch topology references a missing parent'\n",
    "    if (strictReferences && element.parentStitchIds?.some((id) => !elementIds.has(id))) return 'Stitch topology references a missing parent'\n",
)
patch(
    'src/editor/projectIntegrity.ts',
    "      if (!guide || (guide.type !== 'arc' && guide.type !== 'line' && guide.type !== 'curve')) return 'Guide attachment references an incompatible guide'\n",
    "      if (guide && guide.type !== 'arc' && guide.type !== 'line' && guide.type !== 'curve') return 'Guide attachment references an incompatible guide'\n      if (!guide && strictReferences) return 'Guide attachment references an incompatible guide'\n",
)
patch(
    'src/editor/projectIntegrity.ts',
    "      const issue = bindingIssue(binding, guideById)\n",
    "      const issue = bindingIssue(binding, guideById, strictReferences)\n",
)
patch(
    'src/editor/projectIntegrity.ts',
    "      if (binding.parentRowId && !rowIds.has(binding.parentRowId)) return 'Parametric row references a missing parent row'\n",
    "      if (strictReferences && binding.parentRowId && !rowIds.has(binding.parentRowId)) return 'Parametric row references a missing parent row'\n",
)
patch(
    'src/editor/projectSchema.ts',
    "  const integrityIssue = projectIntegrityIssue(project)\n",
    "  const integrityIssue = projectIntegrityIssue(project, raw.schemaVersion >= 17)\n",
)

print('legacy compatibility fix applied')

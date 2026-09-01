import type { Locale } from '../i18n'
import type { StitchElement } from '../types'
import { isElementLocked } from './document'
import { DraftNumberInput } from './DraftNumberInput'
import { semanticStemCount, semanticStemSpacing, spreadForSemanticStemSpacing } from './fanGeometry'
import { requestStitchGeometryEdit } from './stitchGeometryEvents'
import { resolvedStitchGeometry, supportsSemanticSpread } from './stitchGeometry'
import './fanGeometry.css'

export function FanGeometryControl({
  locale,
  element,
}: {
  locale: Locale
  element: StitchElement | null
}) {
  if (!element || isElementLocked(element) || element.parametricRow || !supportsSemanticSpread(element.symbolId)) return null

  const geometry = resolvedStitchGeometry(element)
  const stemCount = semanticStemCount(element.symbolId)
  const spacing = semanticStemSpacing(element.symbolId, geometry.spread)
  if (!stemCount || spacing == null) return null

  const copy = locale === 'ru'
    ? {
        title: 'Геометрия веера',
        spacing: 'Между столбиками',
        height: 'Общая высота, %',
        hint: 'Расстояние задаётся между соседними столбиками при общей точке выхода. Жёлтый боковой маркер на элементе остаётся быстрым свободным способом изменить ширину.',
      }
    : {
        title: 'Fan geometry',
        spacing: 'Stem spacing',
        height: 'Overall height, %',
        hint: 'Spacing is measured between neighboring stems while they keep the same base point. The yellow side handle remains the quick freeform way to change fan width.',
      }

  return (
    <section className="fan-geometry-control" data-testid="fan-geometry-control">
      <div className="fan-geometry-heading">
        <strong>{copy.title}</strong>
        <span>{stemCount}</span>
      </div>
      <div className="fan-geometry-fields">
        <label className="productivity-field">
          <span>{copy.spacing}</span>
          <DraftNumberInput
            ariaLabel={copy.spacing}
            min={4}
            max={80}
            step={1}
            value={Math.round(spacing * 100) / 100}
            onChange={(value) => requestStitchGeometryEdit({
              elementId: element.id,
              patch: { spread: spreadForSemanticStemSpacing(element.symbolId, value) },
            })}
          />
        </label>
        <label className="productivity-field">
          <span>{copy.height}</span>
          <DraftNumberInput
            ariaLabel={copy.height}
            min={35}
            max={300}
            step={5}
            value={Math.round(geometry.scaleY * 100)}
            onChange={(value) => requestStitchGeometryEdit({
              elementId: element.id,
              patch: { scaleY: value / 100 },
            })}
          />
        </label>
      </div>
      <small>{copy.hint}</small>
    </section>
  )
}

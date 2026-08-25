import type { Locale } from '../i18n'
import {
  DEFAULT_STITCH_COLOR,
  STITCH_COLOR_PRESETS,
  normalizedStitchColor,
  storedStitchColor,
} from './elementColor'
import './selectionColor.css'

const COPY = {
  ru: {
    title: 'Цвет',
    mixed: 'Смешанные цвета',
    custom: 'Произвольный цвет',
    reset: 'По умолчанию',
  },
  en: {
    title: 'Color',
    mixed: 'Mixed colors',
    custom: 'Custom color',
    reset: 'Default',
  },
} as const

export function SelectionColorControl({
  locale,
  colors,
  onChange,
}: {
  locale: Locale
  colors: Array<string | undefined>
  onChange: (color?: string) => void
}) {
  if (!colors.length) return null

  const resolved = colors.map(normalizedStitchColor)
  const unique = new Set(resolved)
  const mixed = unique.size > 1
  const current = mixed ? DEFAULT_STITCH_COLOR : resolved[0] ?? DEFAULT_STITCH_COLOR
  const copy = COPY[locale]

  return (
    <div className="selection-color-control">
      <div className="selection-color-heading">
        <strong>{copy.title}</strong>
        <small>{mixed ? copy.mixed : current.toUpperCase()}</small>
      </div>

      <div className="selection-color-swatches">
        {STITCH_COLOR_PRESETS.map((preset) => {
          const active = !mixed && current === preset.value
          const label = locale === 'ru' ? preset.ru : preset.en
          return (
            <button
              key={preset.value}
              type="button"
              className={`selection-color-swatch ${active ? 'active' : ''}`}
              aria-label={label}
              title={label}
              style={{ backgroundColor: preset.value }}
              onClick={() => onChange(storedStitchColor(preset.value))}
            />
          )
        })}
      </div>

      <div className="selection-color-footer">
        <label className="selection-color-custom">
          <span>{copy.custom}</span>
          <input
            type="color"
            aria-label={copy.custom}
            value={current}
            onChange={(event) => onChange(storedStitchColor(event.target.value))}
          />
        </label>
        <button type="button" className="selection-color-reset" onClick={() => onChange(undefined)}>
          {copy.reset}
        </button>
      </div>
    </div>
  )
}

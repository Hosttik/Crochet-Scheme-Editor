export const DEFAULT_STITCH_COLOR = '#202622'

export type StitchColorPreset = {
  value: string
  ru: string
  en: string
}

export const STITCH_COLOR_PRESETS: StitchColorPreset[] = [
  { value: DEFAULT_STITCH_COLOR, ru: 'Чёрный', en: 'Black' },
  { value: '#c2413b', ru: 'Красный', en: 'Red' },
  { value: '#d97706', ru: 'Оранжевый', en: 'Orange' },
  { value: '#ca8a04', ru: 'Жёлтый', en: 'Yellow' },
  { value: '#2f855a', ru: 'Зелёный', en: 'Green' },
  { value: '#2563eb', ru: 'Синий', en: 'Blue' },
  { value: '#7c3aed', ru: 'Фиолетовый', en: 'Violet' },
  { value: '#db2777', ru: 'Розовый', en: 'Pink' },
]

const STITCH_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

export function isStitchColor(value: unknown): value is string {
  return typeof value === 'string' && STITCH_COLOR_PATTERN.test(value)
}

export function normalizedStitchColor(value?: string) {
  return isStitchColor(value) ? value.toLowerCase() : DEFAULT_STITCH_COLOR
}

export function storedStitchColor(value: string) {
  const normalized = normalizedStitchColor(value)
  return normalized === DEFAULT_STITCH_COLOR ? undefined : normalized
}

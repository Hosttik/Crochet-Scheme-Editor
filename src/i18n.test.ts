import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, UI, categoryName, symbolName } from './i18n'

describe('localization', () => {
  it('uses Russian as the default locale', () => {
    expect(DEFAULT_LOCALE).toBe('ru')
  })

  it('contains Russian interface strings', () => {
    expect(UI.ru.tools).toBe('Инструменты')
    expect(UI.ru.snapping).toBe('Привязка')
    expect(UI.ru.exportSvg).toBe('Экспорт SVG')
  })

  it('localizes crochet symbol and category names', () => {
    expect(symbolName('single', 'Single crochet', 'ru')).toBe('Столбик без накида')
    expect(categoryName('Tall stitches', 'ru')).toBe('Высокие столбики')
  })

  it('keeps English translations available', () => {
    expect(symbolName('chain', 'Chain', 'en')).toBe('Chain')
    expect(UI.en.tools).toBe('Tools')
  })
})

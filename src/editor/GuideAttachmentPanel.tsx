import { useEffect, useMemo, useState } from 'react'
import type { Guide, GuideAttachment, GuideAttachmentOrientation, StitchElement } from '../types'
import type { Locale } from '../i18n'
import { DraftNumberInput } from './DraftNumberInput'
import { isPathGuide } from './pathGuides'
import './guideAttachment.css'

const COPY = {
  ru: {
    title: 'Связь с направляющей',
    hint: 'Закреплённый элемент остаётся на пути и следует за направляющей при её изменении.',
    guide: 'Направляющая',
    orientation: 'Ориентация',
    keep: 'Сохранить угол',
    tangent: 'По касательной',
    normal: 'Перпендикулярно',
    attach: 'Закрепить на направляющей',
    detach: 'Отвязать',
    attached: 'Закреплено',
    offset: 'Отступ от пути',
    rotationOffset: 'Поправка угла °',
    noGuides: 'Добавьте дугу, линию или кривую.',
    arc: 'Дуга',
    line: 'Линия',
    curve: 'Кривая',
  },
  en: {
    title: 'Guide attachment',
    hint: 'An attached stitch stays on the path and follows the guide when the guide changes.',
    guide: 'Guide',
    orientation: 'Orientation',
    keep: 'Keep angle',
    tangent: 'Tangent',
    normal: 'Perpendicular',
    attach: 'Attach to guide',
    detach: 'Detach',
    attached: 'Attached',
    offset: 'Path offset',
    rotationOffset: 'Angle offset °',
    noGuides: 'Add an arc, line or curve first.',
    arc: 'Arc',
    line: 'Line',
    curve: 'Curve',
  },
} as const

function guideName(guide: Guide, locale: Locale, index: number) {
  const copy = COPY[locale]
  const name = guide.type === 'arc'
    ? copy.arc
    : guide.type === 'line'
      ? copy.line
      : copy.curve
  return `${index + 1}. ${name}`
}

export function GuideAttachmentPanel({
  locale,
  element,
  guides,
  onAttach,
  onChange,
  onDetach,
}: {
  locale: Locale
  element: StitchElement
  guides: Guide[]
  onAttach: (guideId: string, orientation: GuideAttachmentOrientation) => void
  onChange: (attachment: GuideAttachment) => void
  onDetach: () => void
}) {
  const copy = COPY[locale]
  const pathGuides = useMemo(() => guides.filter(isPathGuide), [guides])
  const attachment = element.guideAttachment
  const [guideId, setGuideId] = useState('')
  const [orientation, setOrientation] = useState<GuideAttachmentOrientation>('tangent')

  useEffect(() => {
    if (attachment) {
      setGuideId(attachment.guideId)
      setOrientation(attachment.orientation)
      return
    }
    if (!guideId || !pathGuides.some((guide) => guide.id === guideId)) {
      setGuideId(pathGuides[0]?.id ?? '')
    }
  }, [attachment, guideId, pathGuides])

  const update = (patch: Partial<GuideAttachment>) => {
    if (!attachment) return
    onChange({ ...attachment, ...patch })
  }

  return (
    <div className="guide-attachment-panel">
      <div className="guide-attachment-heading">
        <strong>{copy.title}</strong>
        {attachment && <span>{copy.attached}</span>}
      </div>
      <p>{copy.hint}</p>

      {!pathGuides.length ? (
        <small className="guide-attachment-empty">{copy.noGuides}</small>
      ) : attachment ? (
        <>
          <label>
            <span>{copy.guide}</span>
            <select
              value={attachment.guideId}
              onChange={(event) => onAttach(event.target.value, attachment.orientation)}
            >
              {pathGuides.map((guide, index) => (
                <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.orientation}</span>
            <select
              value={attachment.orientation}
              onChange={(event) => update({ orientation: event.target.value as GuideAttachmentOrientation })}
            >
              <option value="keep">{copy.keep}</option>
              <option value="tangent">{copy.tangent}</option>
              <option value="normal">{copy.normal}</option>
            </select>
          </label>
          <div className="guide-attachment-numbers">
            <label>
              <span>{copy.offset}</span>
              <DraftNumberInput
                ariaLabel={copy.offset}
                value={attachment.normalOffset}
                step={1}
                onChange={(normalOffset) => update({ normalOffset })}
              />
            </label>
            <label>
              <span>{copy.rotationOffset}</span>
              <DraftNumberInput
                ariaLabel={copy.rotationOffset}
                value={attachment.rotationOffset}
                step={1}
                onChange={(rotationOffset) => update({ rotationOffset })}
              />
            </label>
          </div>
          <button className="guide-attachment-detach" onClick={onDetach}>{copy.detach}</button>
        </>
      ) : (
        <>
          <label>
            <span>{copy.guide}</span>
            <select value={guideId} onChange={(event) => setGuideId(event.target.value)}>
              {pathGuides.map((guide, index) => (
                <option key={guide.id} value={guide.id}>{guideName(guide, locale, index)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{copy.orientation}</span>
            <select
              value={orientation}
              onChange={(event) => setOrientation(event.target.value as GuideAttachmentOrientation)}
            >
              <option value="keep">{copy.keep}</option>
              <option value="tangent">{copy.tangent}</option>
              <option value="normal">{copy.normal}</option>
            </select>
          </label>
          <button
            className="guide-attachment-attach"
            disabled={!guideId}
            onClick={() => guideId && onAttach(guideId, orientation)}
          >
            {copy.attach}
          </button>
        </>
      )}
    </div>
  )
}

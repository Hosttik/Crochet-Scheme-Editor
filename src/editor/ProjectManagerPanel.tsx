import { useEffect, useState } from 'react'
import type { Locale } from '../i18n'
import { Button, PanelHeader } from '../ui/primitives'
import { listLocalProjects, type LocalProjectSummary } from './persistence'
import './projectManager.css'

const COPY = {
  ru: {
    title: 'Проекты',
    name: 'Название схемы',
    newProject: 'Новая',
    duplicate: 'Копия',
    delete: 'Удалить',
    empty: 'Локальные проекты появятся здесь.',
  },
  en: {
    title: 'Projects',
    name: 'Pattern name',
    newProject: 'New',
    duplicate: 'Duplicate',
    delete: 'Delete',
    empty: 'Local projects will appear here.',
  },
} as const

export function ProjectManagerPanel({
  locale,
  activeProjectId,
  currentTitle,
  onRename,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
}: {
  locale: Locale
  activeProjectId: string
  currentTitle: string
  onRename: (title: string) => void
  onOpen: (id: string) => Promise<void>
  onNew: () => Promise<void>
  onDuplicate: () => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const copy = COPY[locale]
  const [projects, setProjects] = useState<LocalProjectSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [nameDraft, setNameDraft] = useState(currentTitle)
  const [error, setError] = useState('')

  const refresh = async () => {
    try {
      setProjects(await listLocalProjects())
      setError('')
    } catch (reason) {
      setProjects([])
      setError(reason instanceof Error ? reason.message : (locale === 'ru' ? 'Не удалось прочитать локальные проекты' : 'Could not read local projects'))
    }
  }

  useEffect(() => {
    void refresh()
  }, [activeProjectId])

  useEffect(() => {
    setNameDraft(currentTitle)
    setProjects((current) => current.map((project) =>
      project.id === activeProjectId ? { ...project, title: currentTitle } : project,
    ))
  }, [activeProjectId, currentTitle])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (locale === 'ru' ? 'Операция с проектом не выполнена' : 'Project operation failed'))
    } finally {
      setBusy(false)
    }
  }

  const commitRename = () => {
    const title = nameDraft.trim()
    if (!title || title === currentTitle) {
      setNameDraft(currentTitle)
      return
    }
    setProjects((current) => current.map((project) =>
      project.id === activeProjectId ? { ...project, title } : project,
    ))
    onRename(title)
  }

  return (
    <section className="panel-section project-manager-panel">
      <PanelHeader
        title={copy.title}
        actions={<span className="project-count" aria-label={`${copy.title}: ${projects.length}`}>{projects.length}</span>}
      />

      <label className="project-name-field">
        <span>{copy.name}</span>
        <input
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              setNameDraft(currentTitle)
              event.currentTarget.blur()
            }
          }}
        />
      </label>

      {projects.length ? (
        <select
          className="project-select"
          value={activeProjectId}
          disabled={busy}
          onChange={(event) => void run(() => onOpen(event.target.value))}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.title}</option>
          ))}
        </select>
      ) : (
        <p className="project-empty">{copy.empty}</p>
      )}

      <div className="project-actions">
        <Button icon="plus" disabled={busy} onClick={() => void run(onNew)}>{copy.newProject}</Button>
        <Button icon="duplicate" disabled={busy} onClick={() => void run(onDuplicate)}>{copy.duplicate}</Button>
        <Button
          icon="trash"
          variant="danger"
          disabled={busy || projects.length <= 1}
          onClick={() => {
            const message = locale === 'ru'
              ? `Удалить проект «${currentTitle}»? Это действие нельзя отменить.`
              : `Delete “${currentTitle}”? This cannot be undone.`
            if (window.confirm(message)) void run(() => onDelete(activeProjectId))
          }}
        >
          {copy.delete}
        </Button>
      </div>
      {error && <p className="project-error" role="alert">{error}</p>}
    </section>
  )
}

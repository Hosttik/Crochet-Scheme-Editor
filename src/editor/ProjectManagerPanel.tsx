import { useEffect, useState } from 'react'
import type { Locale } from '../i18n'
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

  const refresh = async () => setProjects(await listLocalProjects())

  useEffect(() => {
    setNameDraft(currentTitle)
    void refresh()
  }, [activeProjectId, currentTitle])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
      await refresh()
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
    onRename(title)
    setProjects((current) => current.map((project) =>
      project.id === activeProjectId ? { ...project, title } : project,
    ))
  }

  return (
    <section className="panel-section project-manager-panel">
      <div className="section-title-row">
        <h2>{copy.title}</h2>
        <span className="muted-text">{projects.length}</span>
      </div>

      <label className="project-name-field">
        <span>{copy.name}</span>
        <input
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
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
        <button disabled={busy} onClick={() => void run(onNew)}>{copy.newProject}</button>
        <button disabled={busy} onClick={() => void run(onDuplicate)}>{copy.duplicate}</button>
        <button
          className="danger"
          disabled={busy || projects.length <= 1}
          onClick={() => void run(() => onDelete(activeProjectId))}
        >
          {copy.delete}
        </button>
      </div>
    </section>
  )
}

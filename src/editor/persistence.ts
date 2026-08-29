import type { CrochetProject } from '../types'
import { assertProjectIntegrity } from './projectIntegrity'

const DB_NAME = 'crochet-scheme-editor'
const DB_VERSION = 3
const LEGACY_STORE_NAME = 'autosave'
const PROJECTS_STORE_NAME = 'projects'
const SUMMARIES_STORE_NAME = 'project-summaries'
const LEGACY_CURRENT_KEY = 'current-project'
const ACTIVE_PROJECT_KEY = 'crochet-scheme-editor-active-project'
const DEFAULT_PROJECT_ID = 'default-project'

export type LocalProjectSummary = {
  id: string
  title: string
  updatedAt: string
}

let sessionActiveProjectId = DEFAULT_PROJECT_ID

function indexedDbAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function randomProjectId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `project-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function summaryFor(id: string, project: CrochetProject): LocalProjectSummary {
  return {
    id,
    title: project.metadata?.title || 'Crochet scheme',
    updatedAt: project.metadata?.updatedAt || '',
  }
}

export function getActiveProjectId() {
  if (typeof window === 'undefined') return sessionActiveProjectId
  try {
    const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY)
    if (stored) sessionActiveProjectId = stored
  } catch {
    // Keep the in-memory selection when localStorage is unavailable.
  }
  return sessionActiveProjectId
}

export function setActiveProjectId(id: string) {
  sessionActiveProjectId = id
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, id)
  } catch {
    // Project data still lives in IndexedDB; keep the active id for this session.
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (!indexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is unavailable'))
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    let settled = false

    request.onupgradeneeded = () => {
      const database = request.result
      const transaction = request.transaction
      if (!database.objectStoreNames.contains(PROJECTS_STORE_NAME)) database.createObjectStore(PROJECTS_STORE_NAME)
      if (!database.objectStoreNames.contains(SUMMARIES_STORE_NAME)) database.createObjectStore(SUMMARIES_STORE_NAME)

      if (!transaction) return
      const projects = transaction.objectStore(PROJECTS_STORE_NAME)
      const summaries = transaction.objectStore(SUMMARIES_STORE_NAME)

      // Backfill summaries without pulling full project payloads during normal listing.
      const cursor = projects.openCursor()
      cursor.onsuccess = () => {
        const current = cursor.result
        if (!current) return
        const project = current.value as CrochetProject
        summaries.put(summaryFor(String(current.key), project), current.key)
        current.continue()
      }

      if (database.objectStoreNames.contains(LEGACY_STORE_NAME)) {
        // Legacy data must only seed an empty default project. Keeping this
        // migration idempotent prevents a later DB-version bump from restoring
        // stale legacy content over a newer project.
        const currentDefault = projects.get(DEFAULT_PROJECT_ID)
        currentDefault.onsuccess = () => {
          if (currentDefault.result) return
          const legacy = transaction.objectStore(LEGACY_STORE_NAME).get(LEGACY_CURRENT_KEY)
          legacy.onsuccess = () => {
            if (!legacy.result) return
            const project = legacy.result as CrochetProject
            projects.put(project, DEFAULT_PROJECT_ID)
            summaries.put(summaryFor(DEFAULT_PROJECT_ID, project), DEFAULT_PROJECT_ID)
          }
        }
      }
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => database.close()
      if (settled) {
        database.close()
        return
      }
      settled = true
      resolve(database)
    }
    request.onerror = () => {
      if (settled) return
      settled = true
      reject(request.error ?? new Error('Could not open IndexedDB'))
    }
    request.onblocked = () => {
      if (settled) return
      settled = true
      reject(new Error('IndexedDB upgrade is blocked by another open tab'))
    }
  })
}

async function readProject(id: string): Promise<CrochetProject | null> {
  const database = await openDatabase()
  try {
    return await new Promise<CrochetProject | null>((resolve, reject) => {
      const transaction = database.transaction(PROJECTS_STORE_NAME, 'readonly')
      const request = transaction.objectStore(PROJECTS_STORE_NAME).get(id)
      request.onsuccess = () => resolve((request.result as CrochetProject | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Could not read project'))
    })
  } finally {
    database.close()
  }
}

async function writeProject(id: string, project: CrochetProject): Promise<void> {
  assertProjectIntegrity(project)
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE_NAME, SUMMARIES_STORE_NAME], 'readwrite')
      transaction.objectStore(PROJECTS_STORE_NAME).put(project, id)
      transaction.objectStore(SUMMARIES_STORE_NAME).put(summaryFor(id, project), id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save project'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Project transaction aborted'))
    })
  } finally {
    database.close()
  }
}

export async function loadAutosave(): Promise<CrochetProject | null> {
  return readProject(getActiveProjectId())
}

export async function saveAutosave(project: CrochetProject): Promise<void> {
  return writeProject(getActiveProjectId(), project)
}

export async function loadLocalProject(id: string) {
  return readProject(id)
}

export async function saveLocalProject(id: string, project: CrochetProject) {
  await writeProject(id, project)
}

export async function createLocalProject(project: CrochetProject) {
  const id = randomProjectId()
  await writeProject(id, project)
  setActiveProjectId(id)
  return id
}

export async function duplicateLocalProject(project: CrochetProject, title: string) {
  const copy: CrochetProject = {
    ...project,
    metadata: { title, updatedAt: new Date().toISOString() },
  }
  return createLocalProject(copy)
}

export async function listLocalProjects(): Promise<LocalProjectSummary[]> {
  const database = await openDatabase()
  try {
    return await new Promise<LocalProjectSummary[]>((resolve, reject) => {
      const transaction = database.transaction(SUMMARIES_STORE_NAME, 'readonly')
      const request = transaction.objectStore(SUMMARIES_STORE_NAME).getAll()
      request.onsuccess = () => {
        const summaries = (request.result as LocalProjectSummary[]).slice()
        summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        resolve(summaries)
      }
      request.onerror = () => reject(request.error ?? new Error('Could not list projects'))
    })
  } finally {
    database.close()
  }
}

export async function deleteLocalProject(id: string): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE_NAME, SUMMARIES_STORE_NAME], 'readwrite')
      transaction.objectStore(PROJECTS_STORE_NAME).delete(id)
      transaction.objectStore(SUMMARIES_STORE_NAME).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete project'))
    })
  } finally {
    database.close()
  }
}

export async function clearAutosave(): Promise<void> {
  await deleteLocalProject(getActiveProjectId())
}

import type { CrochetProject } from '../types'

const DB_NAME = 'crochet-scheme-editor'
const DB_VERSION = 1
const STORE_NAME = 'autosave'
const CURRENT_KEY = 'current-project'

function indexedDbAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!indexedDbAvailable()) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'))
  })
}

export async function loadAutosave(): Promise<CrochetProject | null> {
  const database = await openDatabase()
  if (!database) return null

  try {
    return await new Promise<CrochetProject | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(CURRENT_KEY)
      request.onsuccess = () => resolve((request.result as CrochetProject | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Could not read autosave'))
    })
  } finally {
    database.close()
  }
}

export async function saveAutosave(project: CrochetProject): Promise<void> {
  const database = await openDatabase()
  if (!database) return

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(project, CURRENT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save autosave'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Autosave transaction aborted'))
    })
  } finally {
    database.close()
  }
}

export async function clearAutosave(): Promise<void> {
  const database = await openDatabase()
  if (!database) return

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(CURRENT_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear autosave'))
    })
  } finally {
    database.close()
  }
}

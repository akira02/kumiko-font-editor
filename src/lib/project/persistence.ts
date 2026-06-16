import type {
  KumikoProjectDraft,
  KumikoProjectSummary,
} from 'src/lib/project/projectTypes'
import { toProjectSummary } from 'src/lib/project/projectTypes'

const DB_NAME = 'kumiko-font-editor'
const STORE_NAME = 'projects'
const PROJECT_SUMMARIES_STORE = 'project_summaries'
export const UFO_PROJECTS_STORE = 'ufo_projects'
export const UFO_METADATA_STORE = 'ufo_metadata'
export const UFO_GLYPHS_STORE = 'ufo_glyphs'
export const UFO_UI_STATE_STORE = 'ufo_ui_state'
export const UFO_REFERENCE_FONTS_STORE = 'ufo_reference_fonts'

export type ProjectDraft = KumikoProjectDraft
export type ProjectSummary = KumikoProjectSummary

export const openDatabase = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = globalThis.indexedDB.open(DB_NAME, 6)

    request.onupgradeneeded = () => {
      const database = request.result
      if (database.objectStoreNames.contains('drafts')) {
        database.deleteObjectStore('drafts')
      }
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(PROJECT_SUMMARIES_STORE)) {
        database.createObjectStore(PROJECT_SUMMARIES_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(UFO_PROJECTS_STORE)) {
        database.createObjectStore(UFO_PROJECTS_STORE, { keyPath: 'projectId' })
      }
      if (!database.objectStoreNames.contains(UFO_METADATA_STORE)) {
        database.createObjectStore(UFO_METADATA_STORE, {
          keyPath: ['projectId', 'ufoId'],
        })
      }
      if (!database.objectStoreNames.contains(UFO_GLYPHS_STORE)) {
        const store = database.createObjectStore(UFO_GLYPHS_STORE, {
          keyPath: ['projectId', 'ufoId', 'layerId', 'glyphName'],
        })
        store.createIndex('byProject', 'projectId', { unique: false })
        store.createIndex(
          'byProjectUfoLayer',
          ['projectId', 'ufoId', 'layerId'],
          {
            unique: false,
          }
        )
        store.createIndex('byUnicode', 'unicodes', {
          unique: false,
          multiEntry: true,
        })
        store.createIndex('byDirty', 'dirtyIndex', { unique: false })
        store.createIndex('byProjectDirty', ['projectId', 'dirtyIndex'], {
          unique: false,
        })
      } else {
        const transaction = request.transaction
        const store = transaction?.objectStore(UFO_GLYPHS_STORE)
        if (store && !store.indexNames.contains('byDirty')) {
          store.createIndex('byDirty', 'dirtyIndex', { unique: false })
        }
        if (store && !store.indexNames.contains('byProjectDirty')) {
          store.createIndex('byProjectDirty', ['projectId', 'dirtyIndex'], {
            unique: false,
          })
        }
      }
      if (!database.objectStoreNames.contains(UFO_UI_STATE_STORE)) {
        database.createObjectStore(UFO_UI_STATE_STORE, {
          keyPath: ['projectId', 'key'],
        })
      }
      if (!database.objectStoreNames.contains(UFO_REFERENCE_FONTS_STORE)) {
        database.createObjectStore(UFO_REFERENCE_FONTS_STORE, {
          keyPath: 'projectId',
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const ensureProjectSummaries = async (database: IDBDatabase) => {
  if (!database.objectStoreNames.contains(PROJECT_SUMMARIES_STORE)) {
    return
  }

  const summaryCount = await new Promise<number>((resolve, reject) => {
    const transaction = database.transaction(
      PROJECT_SUMMARIES_STORE,
      'readonly'
    )
    const store = transaction.objectStore(PROJECT_SUMMARIES_STORE)
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  if (summaryCount > 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [STORE_NAME, PROJECT_SUMMARIES_STORE],
      'readwrite'
    )
    const projectsStore = transaction.objectStore(STORE_NAME)
    const summariesStore = transaction.objectStore(PROJECT_SUMMARIES_STORE)
    const request = projectsStore.openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        return
      }
      summariesStore.put(toProjectSummary(cursor.value as ProjectDraft))
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export const loadProject = async (id: string) => {
  const database = await openDatabase()
  return new Promise<ProjectDraft | null>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () =>
      resolve((request.result as ProjectDraft | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export const loadProjectSummary = async (id: string) => {
  const database = await openDatabase()
  return new Promise<ProjectSummary | null>((resolve, reject) => {
    const transaction = database.transaction(
      PROJECT_SUMMARIES_STORE,
      'readonly'
    )
    const store = transaction.objectStore(PROJECT_SUMMARIES_STORE)
    const request = store.get(id)

    request.onsuccess = () =>
      resolve((request.result as ProjectSummary | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
}

export const saveProject = async (draft: ProjectDraft) => {
  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [STORE_NAME, PROJECT_SUMMARIES_STORE],
      'readwrite'
    )
    transaction.objectStore(STORE_NAME).put(draft)
    transaction
      .objectStore(PROJECT_SUMMARIES_STORE)
      .put(toProjectSummary(draft))

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export const renameProject = async (id: string, title: string) => {
  const database = await openDatabase()
  return new Promise<ProjectSummary | null>((resolve, reject) => {
    const transaction = database.transaction(
      [STORE_NAME, PROJECT_SUMMARIES_STORE],
      'readwrite'
    )
    const draftStore = transaction.objectStore(STORE_NAME)
    const summaryStore = transaction.objectStore(PROJECT_SUMMARIES_STORE)
    let updatedSummary: ProjectSummary | null = null

    const draftRequest = draftStore.get(id)
    draftRequest.onsuccess = () => {
      const draft = draftRequest.result as ProjectDraft | undefined
      if (draft) {
        draftStore.put({ ...draft, title })
      }
    }

    const summaryRequest = summaryStore.get(id)
    summaryRequest.onsuccess = () => {
      const summary = summaryRequest.result as ProjectSummary | undefined
      if (summary) {
        updatedSummary = { ...summary, title }
        summaryStore.put(updatedSummary)
      }
    }

    transaction.oncomplete = () => resolve(updatedSummary)
    transaction.onerror = () => reject(transaction.error)
  })
}

export const getAllProjects = async () => {
  const database = await openDatabase()
  await ensureProjectSummaries(database)
  return new Promise<ProjectSummary[]>((resolve, reject) => {
    const transaction = database.transaction(
      PROJECT_SUMMARIES_STORE,
      'readonly'
    )
    const store = transaction.objectStore(PROJECT_SUMMARIES_STORE)
    const request = store.getAll()

    request.onsuccess = () =>
      resolve(
        (request.result as ProjectSummary[]).sort(
          (a, b) => b.updatedAt - a.updatedAt
        )
      )
    request.onerror = () => reject(request.error)
  })
}

export const deleteProject = async (id: string) => {
  const database = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [STORE_NAME, PROJECT_SUMMARIES_STORE],
      'readwrite'
    )
    transaction.objectStore(STORE_NAME).delete(id)
    transaction.objectStore(PROJECT_SUMMARIES_STORE).delete(id)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

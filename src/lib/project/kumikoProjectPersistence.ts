import {
  KUMIKO_GLYPHS_STORE,
  KUMIKO_PROJECTS_STORE,
  KUMIKO_UI_STATE_STORE,
  openDatabase,
} from 'src/lib/project/persistence'
import type {
  KumikoGlyphPrimaryKey,
  KumikoGlyphRecord,
  KumikoGlyphStoreRecord,
  KumikoProjectRecord,
  KumikoUiStateRecord,
} from 'src/lib/project/kumikoProjectTypes'

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

export const makeKumikoGlyphKey = (
  projectId: string,
  glyphId: string
): KumikoGlyphPrimaryKey => [projectId, glyphId]

export const saveKumikoProjectRecord = async (record: KumikoProjectRecord) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_PROJECTS_STORE, 'readwrite')
  transaction.objectStore(KUMIKO_PROJECTS_STORE).put(record)
  await transactionDone(transaction)
}

export const loadKumikoProjectRecord = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_PROJECTS_STORE, 'readonly')
  return requestToPromise(
    transaction.objectStore(KUMIKO_PROJECTS_STORE).get(projectId)
  ) as Promise<KumikoProjectRecord | undefined>
}

export const renameKumikoProjectRecord = async (
  projectId: string,
  title: string
) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_PROJECTS_STORE, 'readwrite')
  const store = transaction.objectStore(KUMIKO_PROJECTS_STORE)
  const record = (await requestToPromise(store.get(projectId))) as
    | KumikoProjectRecord
    | undefined
  if (record) {
    store.put({ ...record, title, updatedAt: Date.now() })
  }
  await transactionDone(transaction)
}

export const deleteKumikoProjectRecord = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(
    [KUMIKO_PROJECTS_STORE, KUMIKO_GLYPHS_STORE, KUMIKO_UI_STATE_STORE],
    'readwrite'
  )
  transaction.objectStore(KUMIKO_PROJECTS_STORE).delete(projectId)
  transaction
    .objectStore(KUMIKO_GLYPHS_STORE)
    .delete(IDBKeyRange.bound([projectId, ''], [projectId, '\uffff']))
  transaction
    .objectStore(KUMIKO_UI_STATE_STORE)
    .delete(IDBKeyRange.bound([projectId, ''], [projectId, '\uffff']))
  await transactionDone(transaction)
}

export const saveKumikoGlyphRecord = async (record: KumikoGlyphStoreRecord) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readwrite')
  transaction.objectStore(KUMIKO_GLYPHS_STORE).put(record)
  await transactionDone(transaction)
}

export const saveKumikoGlyphRecordBatch = async (
  records: KumikoGlyphStoreRecord[]
) => {
  if (records.length === 0) {
    return
  }

  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readwrite')
  const store = transaction.objectStore(KUMIKO_GLYPHS_STORE)
  for (const record of records) {
    store.put(record)
  }
  await transactionDone(transaction)
}

export const loadKumikoGlyphRecord = async (key: KumikoGlyphPrimaryKey) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readonly')
  return requestToPromise(
    transaction.objectStore(KUMIKO_GLYPHS_STORE).get(key)
  ) as Promise<KumikoGlyphStoreRecord | undefined>
}

export const listKumikoGlyphRecordsForProject = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readonly')
  const index = transaction.objectStore(KUMIKO_GLYPHS_STORE).index('byProject')
  return requestToPromise(index.getAll(projectId)) as Promise<
    KumikoGlyphStoreRecord[]
  >
}

export const listLiveKumikoGlyphRecordsForProject = async (
  projectId: string
) => {
  const records = await listKumikoGlyphRecordsForProject(projectId)
  return records.filter(
    (record): record is KumikoGlyphRecord => !record.deleted
  )
}

export const findKumikoGlyphRecordsByUnicode = async (unicodeHex: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readonly')
  const index = transaction.objectStore(KUMIKO_GLYPHS_STORE).index('byUnicode')
  return requestToPromise(index.getAll(unicodeHex.toUpperCase())) as Promise<
    KumikoGlyphStoreRecord[]
  >
}

export const listExportDirtyKumikoGlyphRecords = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readonly')
  const index = transaction
    .objectStore(KUMIKO_GLYPHS_STORE)
    .index('byProjectExportDirty')
  return requestToPromise(index.getAll([projectId, 1])) as Promise<
    KumikoGlyphStoreRecord[]
  >
}

export const listSyncDirtyKumikoGlyphRecords = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readonly')
  const index = transaction
    .objectStore(KUMIKO_GLYPHS_STORE)
    .index('byProjectSyncDirty')
  return requestToPromise(index.getAll([projectId, 1])) as Promise<
    KumikoGlyphStoreRecord[]
  >
}

export const listDeletedKumikoGlyphRecords = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readonly')
  const index = transaction
    .objectStore(KUMIKO_GLYPHS_STORE)
    .index('byProjectDeleted')
  return requestToPromise(index.getAll([projectId, 1])) as Promise<
    KumikoGlyphStoreRecord[]
  >
}

export const updateKumikoGlyphExportDirtyState = async (
  keys: KumikoGlyphPrimaryKey[],
  exportDirty: boolean | 0 | 1
) => {
  if (keys.length === 0) {
    return
  }

  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readwrite')
  const store = transaction.objectStore(KUMIKO_GLYPHS_STORE)
  const timestamp = Date.now()
  const exportDirtyValue = exportDirty ? 1 : 0

  for (const key of keys) {
    const record = (await requestToPromise(store.get(key))) as
      | KumikoGlyphStoreRecord
      | undefined
    if (!record) {
      continue
    }
    store.put({
      ...record,
      exportDirty: exportDirtyValue,
      updatedAt: timestamp,
    })
  }

  await transactionDone(transaction)
}

export const updateKumikoGlyphSyncDirtyState = async (
  keys: KumikoGlyphPrimaryKey[],
  syncDirty: boolean | 0 | 1
) => {
  if (keys.length === 0) {
    return
  }

  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readwrite')
  const store = transaction.objectStore(KUMIKO_GLYPHS_STORE)
  const timestamp = Date.now()
  const syncDirtyValue = syncDirty ? 1 : 0

  for (const key of keys) {
    const record = (await requestToPromise(store.get(key))) as
      | KumikoGlyphStoreRecord
      | undefined
    if (!record) {
      continue
    }
    store.put({
      ...record,
      syncDirty: syncDirtyValue,
      updatedAt: timestamp,
    })
  }

  await transactionDone(transaction)
}

export const deleteKumikoGlyphRecordBatch = async (
  keys: KumikoGlyphPrimaryKey[]
) => {
  if (keys.length === 0) {
    return
  }

  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_GLYPHS_STORE, 'readwrite')
  const store = transaction.objectStore(KUMIKO_GLYPHS_STORE)
  for (const key of keys) {
    store.delete(key)
  }
  await transactionDone(transaction)
}

export const saveKumikoUiState = async (record: KumikoUiStateRecord) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_UI_STATE_STORE, 'readwrite')
  transaction.objectStore(KUMIKO_UI_STATE_STORE).put(record)
  await transactionDone(transaction)
}

export const saveKumikoUiValue = async (
  projectId: string,
  key: string,
  value: unknown
) => {
  await saveKumikoUiState({ projectId, key, value })
}

export const loadKumikoUiState = async (projectId: string, key: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(KUMIKO_UI_STATE_STORE, 'readonly')
  return requestToPromise(
    transaction.objectStore(KUMIKO_UI_STATE_STORE).get([projectId, key])
  ) as Promise<KumikoUiStateRecord | undefined>
}

export const loadKumikoUiValue = async <T>(projectId: string, key: string) => {
  const record = await loadKumikoUiState(projectId, key)
  return (record?.value as T | undefined) ?? null
}

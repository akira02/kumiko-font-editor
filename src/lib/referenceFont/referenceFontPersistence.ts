// Per-project persistence for the tracing reference font. The raw font bytes
// are stored so tracing fully restores on reopen. This is editor-side data —
// it never enters the exported UFO.

import {
  openDatabase,
  UFO_REFERENCE_FONTS_STORE,
} from 'src/lib/project/persistence'

export interface ReferenceFontRecord {
  projectId: string
  fontName: string
  fontBytes: ArrayBuffer
}

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

export const saveReferenceFont = async (
  projectId: string,
  fontName: string,
  fontBytes: ArrayBuffer
) => {
  const database = await openDatabase()
  const transaction = database.transaction(
    UFO_REFERENCE_FONTS_STORE,
    'readwrite'
  )
  transaction
    .objectStore(UFO_REFERENCE_FONTS_STORE)
    .put({ projectId, fontName, fontBytes })
  await transactionDone(transaction)
}

export const loadReferenceFontRecord = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(
    UFO_REFERENCE_FONTS_STORE,
    'readonly'
  )
  return requestToPromise(
    transaction.objectStore(UFO_REFERENCE_FONTS_STORE).get(projectId)
  ) as Promise<ReferenceFontRecord | undefined>
}

export const deleteReferenceFont = async (projectId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(
    UFO_REFERENCE_FONTS_STORE,
    'readwrite'
  )
  transaction.objectStore(UFO_REFERENCE_FONTS_STORE).delete(projectId)
  await transactionDone(transaction)
}

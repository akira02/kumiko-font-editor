import { saveDraftSnapshot } from 'src/lib/project/draftSave'
import type { GlyphEditTimes } from 'src/lib/glyph/glyphEditTimes'
import type { FontData, PersistenceStatus } from 'src/store'

interface FlushPendingDraftInput {
  projectId: string
  projectTitle: string
  fontData: FontData
  projectQueued?: boolean
  dirtyGlyphIds: string[]
  deletedGlyphIds: string[]
  persistenceRevision?: number
  glyphEditTimes: GlyphEditTimes
  selectedLayerId: string | null
  setPersistenceStatus: (
    status: PersistenceStatus,
    error?: string | null
  ) => void
  markDraftSaved: (
    savedDirtyIds?: string[],
    savedDeletedIds?: string[],
    savedRevision?: number
  ) => void
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export const hasPendingDraftChanges = ({
  projectQueued,
  dirtyGlyphIds,
  deletedGlyphIds,
}: Pick<
  FlushPendingDraftInput,
  'projectQueued' | 'dirtyGlyphIds' | 'deletedGlyphIds'
>) =>
  Boolean(projectQueued) ||
  dirtyGlyphIds.length > 0 ||
  deletedGlyphIds.length > 0

export const flushPendingDraft = async ({
  projectId,
  projectTitle,
  fontData,
  projectQueued = false,
  dirtyGlyphIds,
  deletedGlyphIds,
  persistenceRevision,
  glyphEditTimes,
  selectedLayerId,
  setPersistenceStatus,
  markDraftSaved,
}: FlushPendingDraftInput) => {
  if (
    !hasPendingDraftChanges({ projectQueued, dirtyGlyphIds, deletedGlyphIds })
  ) {
    return false
  }

  try {
    setPersistenceStatus('saving')
    await saveDraftSnapshot({
      projectId,
      projectTitle,
      fontData,
      dirtyGlyphIds,
      deletedGlyphIds,
      projectQueued,
      glyphEditTimes,
      selectedLayerId,
    })
    markDraftSaved(dirtyGlyphIds, deletedGlyphIds, persistenceRevision)
    setPersistenceStatus('saved')
    return true
  } catch (error) {
    setPersistenceStatus(
      'error',
      getErrorMessage(error, 'Unable to save project draft.')
    )
    throw error
  }
}

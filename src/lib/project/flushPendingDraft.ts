import { saveDraftSnapshot } from 'src/lib/project/draftSave'
import type { GlyphEditTimes } from 'src/lib/glyph/glyphEditTimes'
import type { FontData, PersistenceStatus } from 'src/store'

interface FlushPendingDraftInput {
  projectId: string
  projectTitle: string
  fontData: FontData
  dirtyGlyphIds: string[]
  deletedGlyphIds: string[]
  glyphEditTimes: GlyphEditTimes
  selectedLayerId: string | null
  setPersistenceStatus: (
    status: PersistenceStatus,
    error?: string | null
  ) => void
  markDraftSaved: (savedDirtyIds?: string[], savedDeletedIds?: string[]) => void
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export const hasPendingDraftChanges = ({
  dirtyGlyphIds,
  deletedGlyphIds,
}: Pick<FlushPendingDraftInput, 'dirtyGlyphIds' | 'deletedGlyphIds'>) =>
  dirtyGlyphIds.length > 0 || deletedGlyphIds.length > 0

export const flushPendingDraft = async ({
  projectId,
  projectTitle,
  fontData,
  dirtyGlyphIds,
  deletedGlyphIds,
  glyphEditTimes,
  selectedLayerId,
  setPersistenceStatus,
  markDraftSaved,
}: FlushPendingDraftInput) => {
  if (!hasPendingDraftChanges({ dirtyGlyphIds, deletedGlyphIds })) {
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
      glyphEditTimes,
      selectedLayerId,
    })
    markDraftSaved(dirtyGlyphIds, deletedGlyphIds)
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

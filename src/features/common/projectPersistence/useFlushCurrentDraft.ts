import { useCallback } from 'react'
import { flushPendingDraft } from 'src/lib/project/flushPendingDraft'
import { useStore } from 'src/store'

export const useFlushCurrentDraft = () => {
  const markDraftSaved = useStore((state) => state.markDraftSaved)
  const setPersistenceStatus = useStore((state) => state.setPersistenceStatus)

  return useCallback(async () => {
    const {
      projectId,
      projectTitle,
      fontData,
      dirtyGlyphIds,
      deletedGlyphIds,
      glyphEditTimes,
      selectedLayerId,
    } = useStore.getState()

    if (!projectId || !projectTitle || !fontData) {
      return false
    }

    return flushPendingDraft({
      projectId,
      projectTitle,
      fontData,
      dirtyGlyphIds,
      deletedGlyphIds,
      glyphEditTimes,
      selectedLayerId,
      setPersistenceStatus,
      markDraftSaved,
    })
  }, [markDraftSaved, setPersistenceStatus])
}

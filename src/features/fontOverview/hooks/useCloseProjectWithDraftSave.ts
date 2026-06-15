import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@chakra-ui/react'
import { saveDraftSnapshot } from 'src/lib/draftSave'
import { useStore } from 'src/store'

export function useCloseProjectWithDraftSave() {
  const { t } = useTranslation()
  const toast = useToast()
  const closeProjectState = useStore((state) => state.closeProjectState)
  const markDraftSaved = useStore((state) => state.markDraftSaved)
  const isDirty = useStore((state) => state.isDirty)
  const projectId = useStore((state) => state.projectId)
  const projectTitle = useStore((state) => state.projectTitle)
  const fontData = useStore((state) => state.fontData)
  const dirtyGlyphIds = useStore((state) => state.dirtyGlyphIds)
  const deletedGlyphIds = useStore((state) => state.deletedGlyphIds)
  const glyphEditTimes = useStore((state) => state.glyphEditTimes)
  const selectedLayerId = useStore((state) => state.selectedLayerId)
  const [isClosingProject, setIsClosingProject] = useState(false)

  const closeProject = useCallback(async () => {
    if (isClosingProject) {
      return
    }

    if (!isDirty) {
      closeProjectState()
      return
    }

    if (!fontData || !projectId || !projectTitle) {
      closeProjectState()
      return
    }

    setIsClosingProject(true)
    try {
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
      closeProjectState()
    } catch (error) {
      console.warn('Save before closing project failed.', error)
      toast({
        title: t('fontOverview.closeProjectSaveFailed'),
        description: t('fontOverview.closeProjectSaveFailedDescription'),
        status: 'error',
        duration: 3200,
        isClosable: true,
      })
    } finally {
      setIsClosingProject(false)
    }
  }, [
    closeProjectState,
    deletedGlyphIds,
    dirtyGlyphIds,
    fontData,
    glyphEditTimes,
    isClosingProject,
    isDirty,
    markDraftSaved,
    projectId,
    projectTitle,
    selectedLayerId,
    t,
    toast,
  ])

  return { closeProject, isClosingProject }
}

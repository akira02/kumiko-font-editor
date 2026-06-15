import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@chakra-ui/react'
import { useStore, type GlyphData } from 'src/store'

interface UseOverviewSelectionOptions {
  activeGlyphs: GlyphData[]
  selectedGlyphId: string | null
}

export function useOverviewSelection({
  activeGlyphs,
  selectedGlyphId,
}: UseOverviewSelectionOptions) {
  const { t } = useTranslation()
  const toast = useToast()
  const setSelectedGlyphId = useStore((state) => state.setSelectedGlyphId)
  const deleteGlyph = useStore((state) => state.deleteGlyph)
  const selectionAnchorGlyphIdRef = useRef<string | null>(selectedGlyphId)
  const [overviewSelectedGlyphIds, setOverviewSelectedGlyphIds] = useState<
    string[]
  >(() => (selectedGlyphId ? [selectedGlyphId] : []))

  const selectedGlyphIdSet = useMemo(() => {
    const selectedGlyphIds = new Set(overviewSelectedGlyphIds)
    if (selectedGlyphId) {
      selectedGlyphIds.add(selectedGlyphId)
    }
    return selectedGlyphIds
  }, [overviewSelectedGlyphIds, selectedGlyphId])

  const selectedGlyphIdList = useMemo(
    () => [...selectedGlyphIdSet],
    [selectedGlyphIdSet]
  )

  const selectGlyphs = useCallback(
    (glyphIds: string[], primaryGlyphId: string | null) => {
      setOverviewSelectedGlyphIds(glyphIds)
      setSelectedGlyphId(primaryGlyphId)
    },
    [setSelectedGlyphId]
  )

  const selectAddedGlyphs = useCallback(
    (glyphIds: string[]) => {
      const primaryGlyphId = glyphIds[0] ?? null
      selectionAnchorGlyphIdRef.current = primaryGlyphId
      selectGlyphs(primaryGlyphId ? [primaryGlyphId] : [], primaryGlyphId)
    },
    [selectGlyphs]
  )

  const selectGlyphsWithAnchor = useCallback(
    (glyphIds: string[], primaryGlyphId: string | null) => {
      selectionAnchorGlyphIdRef.current = primaryGlyphId
      selectGlyphs(glyphIds, primaryGlyphId)
    },
    [selectGlyphs]
  )

  const handleGlyphSelect = useCallback(
    (glyphId: string, event: MouseEvent) => {
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        event.preventDefault()
      }

      const activeGlyphIds = activeGlyphs.map((glyph) => glyph.id)
      const currentSelection = overviewSelectedGlyphIds.filter((selectedId) =>
        activeGlyphIds.includes(selectedId)
      )
      const currentSelectionSet = new Set(currentSelection)
      const isToggleSelection = event.metaKey || event.ctrlKey

      if (
        !event.shiftKey &&
        !isToggleSelection &&
        currentSelectionSet.has(glyphId)
      ) {
        setSelectedGlyphId(glyphId)
        return
      }

      const anchorGlyphId =
        selectionAnchorGlyphIdRef.current &&
        activeGlyphIds.includes(selectionAnchorGlyphIdRef.current)
          ? selectionAnchorGlyphIdRef.current
          : (currentSelection.at(-1) ?? selectedGlyphId ?? glyphId)

      if (event.shiftKey) {
        const anchorIndex = activeGlyphIds.indexOf(anchorGlyphId)
        const targetIndex = activeGlyphIds.indexOf(glyphId)
        if (anchorIndex < 0 || targetIndex < 0) {
          selectGlyphs([glyphId], glyphId)
          selectionAnchorGlyphIdRef.current = glyphId
          return
        }

        const [startIndex, endIndex] =
          anchorIndex < targetIndex
            ? [anchorIndex, targetIndex]
            : [targetIndex, anchorIndex]
        const rangeGlyphIds = activeGlyphIds.slice(startIndex, endIndex + 1)
        const nextSelection = isToggleSelection
          ? Array.from(new Set([...currentSelection, ...rangeGlyphIds]))
          : rangeGlyphIds
        selectGlyphs(nextSelection, glyphId)
        return
      }

      selectionAnchorGlyphIdRef.current = glyphId

      if (isToggleSelection) {
        const nextSelection = currentSelectionSet.has(glyphId)
          ? currentSelection.filter((selectedId) => selectedId !== glyphId)
          : [...currentSelection, glyphId]
        const primaryGlyphId = currentSelectionSet.has(glyphId)
          ? (nextSelection.at(-1) ?? null)
          : glyphId
        selectGlyphs(nextSelection, primaryGlyphId)
        return
      }

      selectGlyphs([glyphId], glyphId)
    },
    [
      activeGlyphs,
      overviewSelectedGlyphIds,
      selectGlyphs,
      selectedGlyphId,
      setSelectedGlyphId,
    ]
  )

  const handleDeleteSelectedGlyphs = useCallback(() => {
    if (selectedGlyphIdList.length === 0) {
      return
    }

    for (const glyphId of selectedGlyphIdList) {
      deleteGlyph(glyphId)
    }
    selectGlyphs([], null)
    selectionAnchorGlyphIdRef.current = null
    toast({
      title: t('fontOverview.selection.deletedToastTitle'),
      description: t('fontOverview.selection.deletedToastDescription', {
        count: selectedGlyphIdList.length,
      }),
      status: 'success',
      duration: 2200,
      isClosable: true,
    })
  }, [deleteGlyph, selectGlyphs, selectedGlyphIdList, t, toast])

  return {
    handleDeleteSelectedGlyphs,
    handleGlyphSelect,
    overviewSelectedGlyphIds,
    selectAddedGlyphs,
    selectedGlyphIdList,
    selectedGlyphIdSet,
    selectGlyphs,
    selectGlyphsWithAnchor,
  }
}

import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  flattenGlyphOverviewTree,
  getGlyphOverviewTree,
} from 'src/lib/glyphOverview'
import type { GlyphEditTimes } from 'src/lib/glyphEditTimes'
import { isEmptyGlyphToEdit } from 'src/lib/glyphBlankness'
import type { GlyphData } from 'src/store'

interface UseOverviewSectionsOptions {
  filteredGlyphList: GlyphData[]
  glyphEditTimes: GlyphEditTimes
  selectedSectionId: string
  showOnlyEmptyGlyphs: boolean
  onSelectedSectionChange: (sectionId: string) => void
}

export function useOverviewSections({
  filteredGlyphList,
  glyphEditTimes,
  selectedSectionId,
  showOnlyEmptyGlyphs,
  onSelectedSectionChange,
}: UseOverviewSectionsOptions) {
  const { t } = useTranslation()

  const overviewGlyphs = useMemo(
    () =>
      showOnlyEmptyGlyphs
        ? filteredGlyphList.filter(isEmptyGlyphToEdit)
        : filteredGlyphList,
    [filteredGlyphList, showOnlyEmptyGlyphs]
  )

  const treeNodes = useMemo(
    () => getGlyphOverviewTree(overviewGlyphs, glyphEditTimes),
    [glyphEditTimes, overviewGlyphs]
  )

  const sections = useMemo(
    () => flattenGlyphOverviewTree(treeNodes),
    [treeNodes]
  )

  const visibleSections = useMemo(() => {
    const selectedSection = sections.find(
      (section) => section.id === selectedSectionId
    )
    return selectedSection?.glyphs.length ? [selectedSection] : []
  }, [sections, selectedSectionId])

  const activeSection = useMemo(() => {
    if (selectedSectionId === 'all') {
      const allSection = sections.find((section) => section.id === 'all')
      return {
        id: 'all',
        label: t('fontOverview.allGlyphs'),
        glyphs: allSection?.glyphs ?? overviewGlyphs,
      }
    }

    return (
      sections.find((section) => section.id === selectedSectionId) ?? {
        id: 'all',
        label: t('fontOverview.allGlyphs'),
        glyphs: overviewGlyphs,
      }
    )
  }, [overviewGlyphs, sections, selectedSectionId, t])

  useEffect(() => {
    if (
      selectedSectionId !== 'all' &&
      !sections.some((section) => section.id === selectedSectionId)
    ) {
      onSelectedSectionChange('all')
    }
  }, [onSelectedSectionChange, sections, selectedSectionId])

  return {
    activeSection,
    overviewGlyphs,
    sections,
    treeNodes,
    visibleSections,
  }
}

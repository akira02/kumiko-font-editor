import type { FontData, GlobalState } from 'src/store/types'
import { filterGlyphsByOverviewSearch } from 'src/lib/glyph/glyphOverview'

export const IDS_DICTIONARY: Record<string, string[]> = {
  林: ['木', '木'],
  森: ['木', '木', '木'],
  果: ['日', '木'],
  樹: ['木', '尌'],
  機: ['木', '幾'],
}

const getGlyphs = (fontData: FontData | null) =>
  Object.values(fontData?.glyphs ?? {})

const filterGlyphs = (
  fontData: FontData | null,
  query: string,
  idsDictionary: Record<string, string[]>
) => {
  const glyphs = getGlyphs(fontData)
  return filterGlyphsByOverviewSearch(
    glyphs,
    {
      query,
    },
    idsDictionary
  )
}

export const syncFilteredGlyphList = (state: GlobalState) => {
  state.filteredGlyphList = filterGlyphs(
    state.fontData,
    state.currentSearchQuery,
    state.idsDictionary
  )
}

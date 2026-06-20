import type { GlyphData } from 'src/store'

export const OVERVIEW_GEOMETRY_PRELOAD_MARGIN = 48
export const OVERVIEW_MAX_RESIDENT_GLYPH_GEOMETRY = 480

export const collectOverviewGeometryGlyphIds = (
  glyphs: GlyphData[],
  range: { startIndex: number; endIndex: number },
  margin = OVERVIEW_GEOMETRY_PRELOAD_MARGIN
) => {
  if (glyphs.length === 0 || range.endIndex < range.startIndex) {
    return []
  }

  const startIndex = Math.max(0, range.startIndex - margin)
  const endIndex = Math.min(glyphs.length - 1, range.endIndex + margin)
  return glyphs.slice(startIndex, endIndex + 1).map((glyph) => glyph.id)
}

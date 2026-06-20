import { isGlyphGeometryLoaded } from 'src/lib/glyph/glyphGeometryState'
import type { FontData, GlobalState, GlyphData } from 'src/store/types'

type TemporalTrackedState = Pick<GlobalState, 'fontData'>

const stripGlyphGeometry = (glyph: GlyphData): GlyphData => {
  if (!isGlyphGeometryLoaded(glyph)) {
    return glyph
  }

  const stripped = { ...glyph }
  delete stripped.layers
  stripped.activeLayerId = null
  return stripped
}

const getTemporalGeometryGlyphIds = (state: GlobalState) => {
  const glyphIds = new Set<string>()

  for (const glyphId of state.editorGlyphIds) {
    glyphIds.add(glyphId)
  }
  for (const glyphId of state.dirtyGlyphIds) {
    glyphIds.add(glyphId)
  }
  for (const glyphId of state.localDirtyGlyphIds) {
    glyphIds.add(glyphId)
  }
  for (const glyphId of state.persistenceQueue.glyphIds) {
    glyphIds.add(glyphId)
  }
  if (state.selectedGlyphId) {
    glyphIds.add(state.selectedGlyphId)
  }

  return glyphIds
}

export const createTemporalFontDataSnapshot = (
  fontData: FontData,
  geometryGlyphIds: Set<string>
): FontData => {
  const glyphs: FontData['glyphs'] = {}

  for (const [glyphId, glyph] of Object.entries(fontData.glyphs)) {
    glyphs[glyphId] = geometryGlyphIds.has(glyphId)
      ? glyph
      : stripGlyphGeometry(glyph)
  }

  return {
    ...fontData,
    glyphs,
  }
}

export const partializeTemporalState = (
  state: GlobalState
): TemporalTrackedState => ({
  fontData: state.fontData
    ? createTemporalFontDataSnapshot(
        state.fontData,
        getTemporalGeometryGlyphIds(state)
      )
    : null,
})

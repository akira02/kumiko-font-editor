import {
  getGlyphBlockLabel,
  getGlyphScriptLabel,
} from 'src/lib/glyph/glyphOverview'
import type { GlyphData } from 'src/store'

export const getOverviewGlyphMeta = (glyph: GlyphData) => ({
  script: getGlyphScriptLabel(glyph),
  block: getGlyphBlockLabel(glyph),
})

// Loader for the glyph-name lookup table produced by
// scripts/build-glyphdata.mjs (sourced from Glyphs' GlyphData.xml). Maps a
// Glyphs nice name or alt name (leftArrow / verticalbar) to its Unicode and
// production name (arrowleft) so imported glyph lists resolve like Glyphs and
// export with the correct post-table name.

const GLYPH_DATA_PATH = '/glyphsdata/glyphdata.txt'

export interface GlyphNameInfo {
  unicode: string | null
  production: string | null
}

export const parseGlyphDataLine = (
  line: string
): { names: string[]; info: GlyphNameInfo } | null => {
  const [name, unicode, production, altNames] = line.split('\t')
  if (!name) {
    return null
  }
  const names = [name, ...(altNames ? altNames.split(',').filter(Boolean) : [])]
  return {
    names,
    info: {
      unicode: unicode ? unicode.toUpperCase() : null,
      production: production || null,
    },
  }
}

export const buildGlyphNameInfoMap = (text: string) => {
  const map = new Map<string, GlyphNameInfo>()
  for (const line of text.split('\n')) {
    const parsed = parseGlyphDataLine(line)
    if (!parsed) {
      continue
    }
    for (const name of parsed.names) {
      // Primary names are emitted before alts win ties; keep the first entry.
      if (!map.has(name)) {
        map.set(name, parsed.info)
      }
    }
  }
  return map
}

let glyphNameInfoMapPromise: Promise<Map<string, GlyphNameInfo>> | null = null

const loadGlyphNameInfoMap = async () => {
  const response = await fetch(GLYPH_DATA_PATH)
  if (!response.ok) {
    throw new Error(`無法載入 glyph 名稱對應表：${response.status}`)
  }
  return buildGlyphNameInfoMap(await response.text())
}

export const getGlyphNameInfoMap = () => {
  if (!glyphNameInfoMapPromise) {
    glyphNameInfoMapPromise = loadGlyphNameInfoMap().catch((error) => {
      // Allow a retry on the next call instead of caching the failure.
      glyphNameInfoMapPromise = null
      throw error
    })
  }
  return glyphNameInfoMapPromise
}

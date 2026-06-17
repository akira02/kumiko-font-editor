import { activeLayer, type GlyphData } from 'src/store'

const knownBlankGlyphNames = new Set([
  'cr',
  'del',
  'enspace',
  'figurespace',
  'hairspace',
  'space',
  'nbspace',
  'nonbreakingspace',
  'punctuationspace',
  'space-han',
  'thinspace',
  'ideographicspace',
  'zerowidthjoiner',
  'zerowidthspace',
])

const knownBlankUnicodes = new Set([
  '000D',
  '0020',
  '007F',
  '00A0',
  '2002',
  '2007',
  '2008',
  '2009',
  '200A',
  '200B',
  '200D',
  '3000',
])

export const isKnownBlankGlyph = (glyph: GlyphData) => {
  const names = [glyph.id, glyph.name, glyph.production ?? '']
  if (
    names.some((name) => knownBlankGlyphNames.has(name.trim().toLowerCase()))
  ) {
    return true
  }

  return glyph.unicode
    ? knownBlankUnicodes.has(glyph.unicode.trim().toUpperCase())
    : false
}

export const hasDrawableGlyphContent = (glyph: GlyphData) => {
  const layer = activeLayer(glyph)
  return layer.paths.length > 0 || layer.componentRefs.length > 0
}

export const isEmptyGlyphToEdit = (glyph: GlyphData) =>
  !isKnownBlankGlyph(glyph) && !hasDrawableGlyphContent(glyph)

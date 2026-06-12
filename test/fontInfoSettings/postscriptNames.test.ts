import { describe, expect, it } from 'vitest'
import { buildUfoLibFromFontData } from 'src/lib/fontInfoSettings'
import type { FontData, GlyphData } from 'src/store'

const makeGlyph = (id: string, production: string | null): GlyphData =>
  ({
    id,
    name: id,
    unicode: null,
    production,
    metrics: { width: 1000, lsb: 0, rsb: 0 },
    paths: [],
    components: [],
    componentRefs: [],
  }) as unknown as GlyphData

const makeFontData = (glyphs: GlyphData[]): FontData =>
  ({
    glyphs: Object.fromEntries(glyphs.map((glyph) => [glyph.id, glyph])),
  }) as unknown as FontData

describe('buildUfoLibFromFontData public.postscriptNames', () => {
  it('maps glyph id to production name when they differ', () => {
    const lib = buildUfoLibFromFontData(
      makeFontData([makeGlyph('leftArrow', 'arrowleft')])
    )
    expect(lib['public.postscriptNames']).toEqual({ leftArrow: 'arrowleft' })
  })

  it('omits glyphs without a production name or where it equals the id', () => {
    const lib = buildUfoLibFromFontData(
      makeFontData([
        makeGlyph('A', null),
        makeGlyph('uni4E00', 'uni4E00'),
        makeGlyph('leftArrow', 'arrowleft'),
      ])
    )
    expect(lib['public.postscriptNames']).toEqual({ leftArrow: 'arrowleft' })
  })

  it('omits the key entirely when no glyph needs remapping', () => {
    const lib = buildUfoLibFromFontData(makeFontData([makeGlyph('A', null)]))
    expect('public.postscriptNames' in lib).toBe(false)
  })
})

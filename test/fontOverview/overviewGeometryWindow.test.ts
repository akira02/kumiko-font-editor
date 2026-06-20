import { describe, expect, it } from 'vitest'
import {
  collectOverviewGeometryGlyphIds,
  OVERVIEW_GEOMETRY_PRELOAD_MARGIN,
  OVERVIEW_MAX_RESIDENT_GLYPH_GEOMETRY,
} from 'src/features/fontOverview/utils/overviewGeometryWindow'
import type { GlyphData } from 'src/store'

const makeGlyphs = (count: number): GlyphData[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `glyph-${index}`,
    name: `glyph-${index}`,
    unicodes: [],
    layerOrder: ['public.default'],
  }))

describe('overview geometry window', () => {
  it('loads only the visible range plus a small bounded margin', () => {
    const glyphs = makeGlyphs(100)

    expect(
      collectOverviewGeometryGlyphIds(glyphs, {
        startIndex: 20,
        endIndex: 29,
      })
    ).toEqual(Array.from({ length: 18 }, (_, index) => `glyph-${index + 16}`))
  })

  it('clamps preload ranges at section boundaries', () => {
    const glyphs = makeGlyphs(10)

    expect(
      collectOverviewGeometryGlyphIds(glyphs, {
        startIndex: 0,
        endIndex: 2,
      })
    ).toEqual([
      'glyph-0',
      'glyph-1',
      'glyph-2',
      'glyph-3',
      'glyph-4',
      'glyph-5',
      'glyph-6',
    ])

    expect(
      collectOverviewGeometryGlyphIds(glyphs, {
        startIndex: 8,
        endIndex: 9,
      })
    ).toEqual([
      'glyph-4',
      'glyph-5',
      'glyph-6',
      'glyph-7',
      'glyph-8',
      'glyph-9',
    ])
  })

  it('keeps CJK overview residency below the general editor cache ceiling', () => {
    expect(OVERVIEW_GEOMETRY_PRELOAD_MARGIN).toBe(4)
    expect(OVERVIEW_MAX_RESIDENT_GLYPH_GEOMETRY).toBe(240)
  })
})

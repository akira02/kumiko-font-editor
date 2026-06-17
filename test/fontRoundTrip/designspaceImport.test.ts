// @vitest-environment happy-dom
// parseDesignspace uses DOMParser, which needs a DOM; scope it to this file.
import { describe, expect, it } from 'vitest'
import {
  parseDesignspace,
  designspaceToFontAxes,
} from 'src/lib/fontFormats/designspace'
import { buildMultiMasterFontData } from 'src/lib/fontFormats/ufoFormat'
import { getGlyphLayer } from 'src/store/glyphLayer'
import type {
  UfoGlyphRecord,
  UfoMetadataRecord,
} from 'src/lib/fontFormats/ufoTypes'

const DESIGNSPACE = `<?xml version="1.0" encoding="UTF-8"?>
<designspace format="4.1">
  <axes>
    <axis name="Weight" tag="wght" minimum="0" default="0" maximum="100"/>
  </axes>
  <sources>
    <source filename="sources/Light.ufo" name="Light" stylename="Light">
      <location><dimension name="Weight" xvalue="0"/></location>
    </source>
    <source filename="sources/Bold.ufo" name="Bold" stylename="Bold">
      <location><dimension name="Weight" xvalue="100"/></location>
    </source>
  </sources>
</designspace>`

const metadata = (ufoId: string): UfoMetadataRecord => ({
  projectId: 'p',
  ufoId,
  relativePath: ufoId,
  metainfo: {},
  fontinfo: { unitsPerEm: 1000 },
  lib: {},
  groups: {},
  kerning: {},
  featuresText: null,
  layers: [{ layerId: 'public.default', glyphDir: 'glyphs' }],
  contents: { A: 'A.glif' },
  glyphOrder: ['A'],
  updatedAt: 0,
})

const glyphRecord = (
  ufoId: string,
  x: number,
  width: number
): UfoGlyphRecord => ({
  projectId: 'p',
  ufoId,
  layerId: 'public.default',
  glyphName: 'A',
  fileName: 'A.glif',
  sourceHash: null,
  unicodes: ['0041'],
  advance: { width, height: null },
  anchors: [],
  guidelines: [],
  contours: [{ points: [{ x, y: 0, type: 'line' }] }],
  components: [],
  note: null,
  image: null,
  lib: null,
  dirty: false,
  dirtyIndex: 0,
  updatedAt: 0,
})

describe('parseDesignspace', () => {
  it('parses axes and sources with locations', () => {
    const ds = parseDesignspace(DESIGNSPACE)
    expect(ds.axes).toHaveLength(1)
    expect(ds.axes[0]).toMatchObject({
      name: 'Weight',
      tag: 'wght',
      minimum: 0,
      default: 0,
      maximum: 100,
    })
    expect(ds.sources.map((s) => s.name)).toEqual(['Light', 'Bold'])
    expect(ds.sources[1].location).toEqual({ Weight: 100 })
  })

  it('converts axes to FontAxes', () => {
    const axes = designspaceToFontAxes(parseDesignspace(DESIGNSPACE))
    expect(axes.axes[0]).toMatchObject({
      name: 'Weight',
      tag: 'wght',
      minValue: 0,
      defaultValue: 0,
      maxValue: 100,
    })
  })
})

describe('buildMultiMasterFontData', () => {
  const build = () =>
    buildMultiMasterFontData(
      [metadata('sources/Light.ufo'), metadata('sources/Bold.ufo')],
      [
        glyphRecord('sources/Light.ufo', 10, 500),
        glyphRecord('sources/Bold.ufo', 80, 700),
      ],
      parseDesignspace(DESIGNSPACE)
    )

  it('creates one source per designspace source', () => {
    const fontData = build()
    expect(Object.keys(fontData.sources ?? {})).toEqual(['Light', 'Bold'])
    expect(fontData.sources?.Bold.location).toEqual({ Weight: 100 })
    expect(fontData.axes?.axes[0].tag).toBe('wght')
  })

  it('builds one master layer per source with that source content', () => {
    const glyph = build().glyphs.A
    expect(glyph.activeLayerId).toBe('Light')
    expect(glyph.layerOrder).toEqual(['Light', 'Bold'])
    expect(getGlyphLayer(glyph, 'Light')?.paths[0].nodes[0].x).toBe(10)
    expect(getGlyphLayer(glyph, 'Light')?.metrics.width).toBe(500)
    expect(getGlyphLayer(glyph, 'Bold')?.paths[0].nodes[0].x).toBe(80)
    expect(getGlyphLayer(glyph, 'Bold')?.metrics.width).toBe(700)
  })

  it('points activeLayerId at the default-location source', () => {
    expect(build().glyphs.A.activeLayerId).toBe('Light')
  })
})

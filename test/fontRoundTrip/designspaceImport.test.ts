import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'
import { Window } from 'happy-dom'
import { strFromU8, unzipSync } from 'fflate'
import {
  parseDesignspace,
  designspaceToFontAxes,
  serializeDesignspace,
} from 'src/lib/fontFormats/designspace'
import {
  buildMultiMasterFontData,
  resolveSourceRefs,
  resolveDefaultSourceRef,
} from 'src/lib/fontFormats/ufoFormat'
import { getGlyphLayer } from 'src/store/glyphLayer'
import type {
  UfoGlyphRecord,
  UfoMetadataRecord,
} from 'src/lib/fontFormats/ufoTypes'
import { exportCanonicalFontDataAsUfoZip } from './canonicalUfoExportTestUtils'

const testWindow = new Window()
globalThis.DOMParser ??= testWindow.DOMParser as typeof globalThis.DOMParser
globalThis.Node ??= testWindow.Node as typeof globalThis.Node
globalThis.Element ??= testWindow.Element as typeof globalThis.Element

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

  it('folds brace sources and bracket rules into canonical layers', () => {
    const designspace = parseDesignspace(`<?xml version="1.0" encoding="UTF-8"?>
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
    <source filename="A-brace.brace.ufo" name="A Brace" stylename="A Brace">
      <location><dimension name="Weight" xvalue="50"/></location>
    </source>
  </sources>
  <rules processing="last">
    <rule name="A.bracket">
      <conditionset>
        <condition name="Weight" minimum="80" maximum="100"/>
      </conditionset>
      <sub name="A" with="A.bracket.bracket"/>
    </rule>
  </rules>
</designspace>`)
    const fontData = buildMultiMasterFontData(
      [
        metadata('sources/Light.ufo'),
        metadata('sources/Bold.ufo'),
        metadata('A-brace.brace.ufo'),
      ],
      [
        glyphRecord('sources/Light.ufo', 10, 500),
        glyphRecord('sources/Bold.ufo', 80, 700),
        glyphRecord('A-brace.brace.ufo', 40, 550),
        {
          ...glyphRecord('sources/Light.ufo', 90, 560),
          glyphName: 'A.bracket.bracket',
          fileName: 'A.bracket.bracket.glif',
        },
      ],
      designspace
    )

    const glyph = fontData.glyphs.A
    expect(fontData.sources).toEqual({
      Light: { id: 'Light', name: 'Light', location: { Weight: 0 } },
      Bold: { id: 'Bold', name: 'Bold', location: { Weight: 100 } },
    })
    expect(fontData.glyphs['A.bracket.bracket']).toBeUndefined()
    expect(glyph.layerOrder).toEqual(['Light', 'Bold', 'A Brace', 'bracket'])
    expect(glyph.layers?.['A Brace']).toMatchObject({
      type: 'brace',
      associatedMasterId: 'Light',
      braceLocation: { Weight: 50 },
    })
    expect(glyph.layers?.['A Brace'].metrics.width).toBe(550)
    expect(glyph.layers?.bracket).toMatchObject({
      type: 'bracket',
      associatedMasterId: 'Light',
      bracketAxisRules: { Weight: { min: 80, max: 100 } },
    })
    expect(glyph.layers?.bracket.metrics.width).toBe(560)
  })

  it('points activeLayerId at the default-location source', () => {
    expect(build().glyphs.A.activeLayerId).toBe('Light')
  })
})

describe('resolveSourceRefs (save-path routing)', () => {
  const refs = () =>
    resolveSourceRefs(
      [metadata('sources/Light.ufo'), metadata('sources/Bold.ufo')],
      parseDesignspace(DESIGNSPACE)
    )

  it('maps each source id to its UFO and default layer', () => {
    expect(refs()).toEqual([
      {
        sourceId: 'Light',
        name: 'Light',
        location: { Weight: 0 },
        ufoId: 'sources/Light.ufo',
        layerId: 'public.default',
      },
      {
        sourceId: 'Bold',
        name: 'Bold',
        location: { Weight: 100 },
        ufoId: 'sources/Bold.ufo',
        layerId: 'public.default',
      },
    ])
  })

  it('resolves the default source by default location', () => {
    expect(
      resolveDefaultSourceRef(refs(), parseDesignspace(DESIGNSPACE))?.sourceId
    ).toBe('Light')
  })
})

describe('serializeDesignspace round-trip', () => {
  it('re-parses to the same axes and source locations', () => {
    const fontData = buildMultiMasterFontData(
      [metadata('sources/Light.ufo'), metadata('sources/Bold.ufo')],
      [
        glyphRecord('sources/Light.ufo', 10, 500),
        glyphRecord('sources/Bold.ufo', 80, 700),
      ],
      parseDesignspace(DESIGNSPACE)
    )
    const xml = serializeDesignspace(
      fontData.axes,
      Object.values(fontData.sources ?? {}).map((source) => ({
        filename: `${source.name}.ufo`,
        name: source.name,
        location: source.location,
      }))
    )
    const reparsed = parseDesignspace(xml)
    expect(reparsed.axes[0]).toMatchObject({
      name: 'Weight',
      tag: 'wght',
      minimum: 0,
      default: 0,
      maximum: 100,
    })
    expect(reparsed.sources.map((s) => s.location)).toEqual([
      { Weight: 0 },
      { Weight: 100 },
    ])
  })
})

describe('canonical multi-master UFO export', () => {
  const fontData = () =>
    buildMultiMasterFontData(
      [metadata('sources/Light.ufo'), metadata('sources/Bold.ufo')],
      [
        glyphRecord('sources/Light.ufo', 10, 500),
        glyphRecord('sources/Bold.ufo', 80, 700),
      ],
      parseDesignspace(DESIGNSPACE)
    )

  it('writes a designspace plus one ufo per source', async () => {
    const blob = await exportCanonicalFontDataAsUfoZip({
      fontData: fontData(),
      projectId: 'canonical-multi-master-basic',
      projectTitle: 'Fam',
      projectSourceFormat: 'glyphs',
    })
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const paths = Object.keys(files)

    expect(paths).toContain('Fam.designspace')
    expect(paths.some((p) => p.startsWith('Light.ufo/'))).toBe(true)
    expect(paths.some((p) => p.startsWith('Bold.ufo/'))).toBe(true)
    expect(paths).toContain('Light.ufo/glyphs/A.glif')
    expect(paths).toContain('Bold.ufo/glyphs/A.glif')

    const designspace = parseDesignspace(strFromU8(files['Fam.designspace']))
    expect(designspace.sources.map((s) => s.filename).sort()).toEqual([
      'Bold.ufo',
      'Light.ufo',
    ])
  })

  it('projects brace layers to sparse sources and bracket layers to rules', async () => {
    const data = fontData()
    data.glyphs.A.layers = {
      ...data.glyphs.A.layers,
      brace: {
        id: 'brace',
        name: 'A Brace',
        type: 'brace',
        associatedMasterId: 'Light',
        braceLocation: { Weight: 50 },
        paths: [
          {
            id: 'brace-path',
            closed: false,
            nodes: [
              {
                id: 'n1',
                kind: 'oncurve',
                segmentType: 'line',
                x: 40,
                y: 0,
              },
              {
                id: 'n2',
                kind: 'oncurve',
                segmentType: 'line',
                x: 140,
                y: 0,
              },
            ],
          },
        ],
        componentRefs: [],
        anchors: [],
        guidelines: [],
        metrics: { width: 550, lsb: 40, rsb: 410 },
      },
      bracket: {
        id: 'bracket',
        name: 'A Bracket',
        type: 'bracket',
        associatedMasterId: 'Light',
        bracketAxisRules: { Weight: { min: 80, max: 100 } },
        paths: [
          {
            id: 'bracket-path',
            closed: false,
            nodes: [
              {
                id: 'n1',
                kind: 'oncurve',
                segmentType: 'line',
                x: 90,
                y: 0,
              },
              {
                id: 'n2',
                kind: 'oncurve',
                segmentType: 'line',
                x: 190,
                y: 0,
              },
            ],
          },
        ],
        componentRefs: [],
        anchors: [],
        guidelines: [],
        metrics: { width: 560, lsb: 90, rsb: 370 },
      },
    }
    data.glyphs.A.layerOrder = [
      ...(data.glyphs.A.layerOrder ?? []),
      'brace',
      'bracket',
    ]

    const blob = await exportCanonicalFontDataAsUfoZip({
      fontData: data,
      projectId: 'canonical-multi-master-special-layers',
      projectTitle: 'Fam',
      projectSourceFormat: 'glyphs',
    })
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const designspaceText = strFromU8(files['Fam.designspace'])
    const designspace = parseDesignspace(designspaceText)

    expect(
      designspace.sources.some((source) =>
        source.filename.includes('brace.ufo')
      )
    ).toBe(true)
    expect(designspace.rules?.[0]).toMatchObject({
      conditions: { Weight: { minimum: 80, maximum: 100 } },
      substitutions: [{ name: 'A', with: 'A.bracket.bracket' }],
    })
    expect(
      Object.keys(files).some((path) =>
        /^.+\.ufo\/glyphs\/.+bracket\.bracket\.glif$/.test(path)
      )
    ).toBe(true)
    expect(
      Object.keys(files).some(
        (path) => path.includes('brace.ufo/glyphs/') && path.endsWith('A.glif')
      )
    ).toBe(true)
  })

  it("each source ufo carries that source's outline", async () => {
    const blob = await exportCanonicalFontDataAsUfoZip({
      fontData: fontData(),
      projectId: 'canonical-multi-master-outlines',
      projectTitle: 'Fam',
      projectSourceFormat: 'glyphs',
    })
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    expect(strFromU8(files['Light.ufo/glyphs/A.glif'])).toContain('x="10"')
    expect(strFromU8(files['Bold.ufo/glyphs/A.glif'])).toContain('x="80"')
  })
})

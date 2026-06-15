import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, it } from 'vitest'

import {
  exportFontAsBinary,
  importBinaryFontFile,
} from 'src/lib/fontBinaryFormat'
import type { FontData, GlyphData } from 'src/store'

// Public Sans Regular (CFF/OTF, OFL) — see test/fixtures/otf/OFL.txt.
//
// Scope: this verifies the outline + metrics round-trip
// (importBinaryFontFile → exportFontAsBinary → importBinaryFontFile).
// It deliberately does NOT cover OpenType feature (GSUB/GPOS) preservation:
// feature compilation runs in a Web Worker that is unavailable under Node, so
// openTypeFeatures is dropped before export. Treat this as glyph-outline
// fidelity, not full font fidelity.
const FIXTURE_URL = new URL(
  '../fixtures/otf/PublicSans-Regular.otf',
  import.meta.url
)

const loadFixtureFile = async () => {
  const buffer = await readFile(fileURLToPath(FIXTURE_URL))
  return new File([buffer], 'PublicSans-Regular.otf', { type: 'font/otf' })
}

const parsesToZero = (unicode: GlyphData['unicode']) =>
  unicode != null && Number.parseInt(unicode, 16) === 0

// opentype.js reserves U+0000 for .null and rejects any other glyph mapped to
// it (Public Sans ships a uni0000 glyph), so drop those before export. Also
// drop openTypeFeatures so export stays a pure opentype.js serialization.
const prepareForExport = (fontData: FontData): FontData => {
  const glyphs: Record<string, GlyphData> = {}
  for (const [id, glyph] of Object.entries(fontData.glyphs)) {
    if (parsesToZero(glyph.unicode)) continue
    glyphs[id] = glyph
  }
  return {
    ...fontData,
    glyphs,
    glyphOrder: fontData.glyphOrder?.filter((id) => Boolean(glyphs[id])),
    openTypeFeatures: undefined,
  }
}

const reimport = async (blob: Blob, name: string) => {
  const buffer = await blob.arrayBuffer()
  return importBinaryFontFile(new File([buffer], name, { type: 'font/otf' }))
}

const nodeCount = (glyph: GlyphData) =>
  glyph.paths.reduce((sum, path) => sum + path.nodes.length, 0)

describe('OTF import → export round-trip', () => {
  let prepared: FontData
  let result: FontData

  beforeAll(async () => {
    const first = await importBinaryFontFile(await loadFixtureFile())
    prepared = prepareForExport(first.fontData)
    const blob = await exportFontAsBinary(prepared, 'otf')
    result = (await reimport(blob, 'roundtrip.otf')).fontData
  })

  it('preserves the glyph set and order', () => {
    expect(Object.keys(result.glyphs).length).toBe(
      Object.keys(prepared.glyphs).length
    )
    expect(result.glyphOrder?.[0]).toBe('.notdef')
    expect(result.glyphOrder).toEqual(prepared.glyphOrder)
  })

  it('preserves font-level metrics', () => {
    expect(result.unitsPerEm).toBe(prepared.unitsPerEm)
  })

  it('preserves unicode, advance width, and node count for every glyph', () => {
    for (const [id, before] of Object.entries(prepared.glyphs)) {
      const after = result.glyphs[id]
      expect(after, `glyph ${id} missing after round-trip`).toBeDefined()
      expect(after.unicode, `unicode for ${id}`).toBe(before.unicode)
      expect(after.metrics.width, `advance width for ${id}`).toBe(
        before.metrics.width
      )
      expect(nodeCount(after), `node count for ${id}`).toBe(nodeCount(before))
    }
  })

  it('preserves exact contour coordinates for sampled glyphs', () => {
    const samples = ['A', 'V', 'o', 'period', 'eight', 'g', 'Q']
    const present = samples.filter((id) => prepared.glyphs[id])
    expect(present.length).toBeGreaterThan(0)

    for (const id of present) {
      const before = prepared.glyphs[id]
      const after = result.glyphs[id]
      expect(after.paths.length, `contour count for ${id}`).toBe(
        before.paths.length
      )
      before.paths.forEach((path, pathIndex) => {
        const afterPath = after.paths[pathIndex]
        expect(afterPath.closed).toBe(path.closed)
        path.nodes.forEach((node, nodeIndex) => {
          const afterNode = afterPath.nodes[nodeIndex]
          // CFF integer coordinates survive a round-trip exactly; allow a
          // 1-unit slack only as defense against incidental rounding.
          expect(
            Math.abs(afterNode.x - node.x),
            `${id} x@${nodeIndex}`
          ).toBeLessThanOrEqual(1)
          expect(
            Math.abs(afterNode.y - node.y),
            `${id} y@${nodeIndex}`
          ).toBeLessThanOrEqual(1)
          expect(afterNode.type, `${id} type@${nodeIndex}`).toBe(node.type)
        })
      })
    }
  })
})

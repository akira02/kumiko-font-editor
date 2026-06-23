import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { importBinaryFontFile } from 'src/lib/fontFormats/fontBinaryFormat'

const FIRA_CODE_URL = new URL(
  '../../test_glyphs/FiraCode-Regular.otf',
  import.meta.url
)
const FIRA_CODE_PATH = fileURLToPath(FIRA_CODE_URL)
const itWithFiraCode = existsSync(FIRA_CODE_PATH) ? it : it.skip

const loadFiraCode = async () => {
  const buffer = await readFile(FIRA_CODE_PATH)
  return new File([buffer], 'FiraCode-Regular.otf', { type: 'font/otf' })
}

const hasOnlyFormat3Subtables = (formats: unknown) =>
  Array.isArray(formats) && formats.every((format) => format === 3)

describe('Fira Code OpenType feature regression', () => {
  itWithFiraCode(
    'reconstructs calt GSUB type 6 format 3 lookups without unsupported fallback',
    async () => {
      const imported = await importBinaryFontFile(await loadFiraCode())
      const state = imported.fontData.openTypeFeatures!
      const caltFeature = state.features.find(
        (feature) => feature.tag === 'calt'
      )
      const caltLookupIds = new Set(
        caltFeature?.entries.flatMap((entry) => entry.lookupIds) ?? []
      )
      const caltLookups = state.lookups.filter((lookup) =>
        caltLookupIds.has(lookup.id)
      )
      const gsubSection = state.sourceSections.find(
        (section) => section.id === 'source_compiled_gsub'
      )

      expect(imported.fontData.glyphOrder).toHaveLength(1617)
      expect(caltFeature).toBeDefined()
      expect(caltLookups).toHaveLength(124)
      expect(
        caltLookups.every(
          (lookup) =>
            lookup.lookupType === 'chainingContextSubst' &&
            lookup.editable &&
            hasOnlyFormat3Subtables(lookup.meta?.subtableFormats)
        )
      ).toBe(true)
      expect(
        caltLookups.reduce((sum, lookup) => sum + lookup.rules.length, 0)
      ).toBe(552)
      expect(state.unsupportedLookups).toEqual([])
      expect(state.diagnostics ?? []).toEqual([])
      expect(state.glyphClasses.length).toBeGreaterThan(0)
      expect(gsubSection).toMatchObject({
        status: 'classified',
        preservationPolicy: 'editable-rebuild',
      })
      expect(
        gsubSection?.recordRefs.some((ref) => ref.kind === 'glyphClass')
      ).toBe(true)
    }
  )
})

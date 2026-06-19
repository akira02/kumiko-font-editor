import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'
import {
  saveProjectDraft,
  loadProjectDraft,
} from 'src/lib/project/projectRepository'
import {
  findKumikoGlyphRecordsByUnicode,
  listExportDirtyKumikoGlyphRecords,
  loadKumikoGlyphRecord,
  loadKumikoProjectRecord,
  makeKumikoGlyphKey,
} from 'src/lib/project/kumikoProjectPersistence'
import { saveDraftSnapshot } from 'src/lib/project/draftSave'
import { openDatabase } from 'src/lib/project/persistence'
import type { FontData } from 'src/store'

const fontData: FontData = {
  glyphOrder: ['A'],
  glyphs: {
    A: {
      id: 'A',
      name: 'A',
      unicodes: ['0041'],
      activeLayerId: 'public.default',
      layerOrder: ['public.default'],
      layers: {
        'public.default': {
          id: 'public.default',
          name: 'public.default',
          type: 'master',
          associatedMasterId: 'public.default',
          paths: [],
          componentRefs: [],
          anchors: [],
          guidelines: [],
          metrics: { width: 500, lsb: 0, rsb: 500 },
        },
      },
    },
  },
}

describe('projectRepository canonical storage', () => {
  it('stores drafts as Kumiko project and glyph records', async () => {
    await saveProjectDraft({
      id: 'project-1',
      title: 'Repository Test',
      lastModified: 20,
      createdAt: 10,
      updatedAt: 20,
      sourceName: 'Test.glyphs',
      sourceType: 'local',
      fontData,
      projectMetadata: { familyName: 'Repository Test' },
      projectSourceData: {
        glyphs: {
          formatVersion: 3,
          packageName: null,
          repoPath: null,
          documentFields: { familyName: 'Repository Test' },
        },
      },
      projectSourceFormat: 'glyphs',
      exportDirtyGlyphIds: ['A'],
    })

    const projectRecord = await loadKumikoProjectRecord('project-1')
    const dirtyGlyphs = await listExportDirtyKumikoGlyphRecords('project-1')
    const unicodeGlyphs = await findKumikoGlyphRecordsByUnicode(
      'project-1',
      'U+41'
    )
    const shortUnicodeGlyphs = await findKumikoGlyphRecordsByUnicode(
      'project-1',
      '41'
    )
    const loaded = await loadProjectDraft('project-1')

    expect(projectRecord?.sourceData?.glyphs?.formatVersion).toBe(3)
    expect(projectRecord?.exportedDigest).toMatch(/^[0-9a-f]{8}$/)
    expect(projectRecord?.syncedDigest).toMatch(/^[0-9a-f]{8}$/)
    expect(dirtyGlyphs.map((glyph) => glyph.glyphId)).toEqual(['A'])
    expect(unicodeGlyphs.map((glyph) => glyph.glyphId)).toEqual(['A'])
    expect(shortUnicodeGlyphs.map((glyph) => glyph.glyphId)).toEqual(['A'])
    expect(dirtyGlyphs[0]?.exportedDigest).toBeNull()
    expect(loaded?.fontData?.glyphs.A.unicodes).toEqual(['0041'])
    expect(loaded?.projectMetadata).toEqual({ familyName: 'Repository Test' })
  })

  it('creates only canonical IndexedDB stores', async () => {
    const database = await openDatabase()
    expect(Array.from(database.objectStoreNames).sort()).toEqual([
      'kumiko_glyphs',
      'kumiko_projects',
      'kumiko_ui_state',
    ])
  })

  it('autosaves only dirty and deleted glyph records', async () => {
    const twoGlyphFontData: FontData = {
      glyphOrder: ['A', 'B'],
      glyphs: {
        ...fontData.glyphs,
        B: {
          ...fontData.glyphs.A,
          id: 'B',
          name: 'B',
          unicodes: ['0042'],
        },
      },
    }
    await saveProjectDraft({
      id: 'project-incremental',
      title: 'Incremental',
      lastModified: 20,
      createdAt: 10,
      updatedAt: 20,
      sourceName: 'Incremental.ufo',
      sourceType: 'local',
      fontData: twoGlyphFontData,
      projectMetadata: null,
      projectSourceData: null,
      projectSourceFormat: 'ufo',
    })

    const nextFontData: FontData = {
      ...twoGlyphFontData,
      glyphOrder: ['A'],
      glyphs: {
        A: {
          ...twoGlyphFontData.glyphs.A,
          layers: {
            'public.default': {
              ...twoGlyphFontData.glyphs.A.layers!['public.default']!,
              metrics: { width: 640, lsb: 0, rsb: 640 },
            },
          },
        },
      },
    }

    await saveDraftSnapshot({
      projectId: 'project-incremental',
      projectTitle: 'Incremental',
      fontData: nextFontData,
      dirtyGlyphIds: ['A'],
      deletedGlyphIds: ['B'],
      glyphEditTimes: { A: 30 },
      selectedLayerId: 'public.default',
    })

    const [project, glyphA, glyphB] = await Promise.all([
      loadKumikoProjectRecord('project-incremental'),
      loadKumikoGlyphRecord(makeKumikoGlyphKey('project-incremental', 'A')),
      loadKumikoGlyphRecord(makeKumikoGlyphKey('project-incremental', 'B')),
    ])

    expect(project?.glyphOrder).toEqual(['A'])
    expect(glyphA?.layers['public.default']?.metrics.width).toBe(640)
    expect(glyphA?.exportDirty).toBe(1)
    expect(glyphB).toBeUndefined()
  })

  it('persists glyph rename as old-key delete plus new-key add', async () => {
    const originalFontData: FontData = {
      glyphOrder: ['A', 'B'],
      glyphs: {
        A: fontData.glyphs.A,
        B: {
          ...fontData.glyphs.A,
          id: 'B',
          name: 'B',
          unicodes: ['0042'],
          layers: {
            'public.default': {
              ...fontData.glyphs.A.layers!['public.default']!,
              componentRefs: [
                {
                  id: 'component-1',
                  glyphId: 'A',
                  x: 0,
                  y: 0,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                },
              ],
            },
          },
        },
      },
    }
    await saveProjectDraft({
      id: 'project-rename',
      title: 'Rename',
      lastModified: 20,
      createdAt: 10,
      updatedAt: 20,
      sourceName: 'Rename.ufo',
      sourceType: 'local',
      fontData: originalFontData,
      projectMetadata: null,
      projectSourceData: null,
      projectSourceFormat: 'ufo',
    })

    const renamedFontData: FontData = {
      ...originalFontData,
      glyphOrder: ['A.alt', 'B'],
      glyphs: {
        'A.alt': {
          ...originalFontData.glyphs.A,
          id: 'A.alt',
          name: 'A.alt',
        },
        B: {
          ...originalFontData.glyphs.B,
          layers: {
            'public.default': {
              ...originalFontData.glyphs.B.layers!['public.default']!,
              componentRefs: [
                {
                  id: 'component-1',
                  glyphId: 'A.alt',
                  x: 0,
                  y: 0,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                },
              ],
            },
          },
        },
      },
    }

    await saveDraftSnapshot({
      projectId: 'project-rename',
      projectTitle: 'Rename',
      fontData: renamedFontData,
      dirtyGlyphIds: ['A.alt', 'B'],
      deletedGlyphIds: ['A'],
      glyphEditTimes: { 'A.alt': 40, B: 40 },
      selectedLayerId: 'public.default',
    })

    const [project, oldGlyph, newGlyph, dependentGlyph] = await Promise.all([
      loadKumikoProjectRecord('project-rename'),
      loadKumikoGlyphRecord(makeKumikoGlyphKey('project-rename', 'A')),
      loadKumikoGlyphRecord(makeKumikoGlyphKey('project-rename', 'A.alt')),
      loadKumikoGlyphRecord(makeKumikoGlyphKey('project-rename', 'B')),
    ])

    expect(project?.glyphOrder).toEqual(['A.alt', 'B'])
    expect(oldGlyph).toBeUndefined()
    expect(newGlyph?.glyphId).toBe('A.alt')
    expect(dependentGlyph?.componentGlyphIds).toEqual(['A.alt'])
    expect(dependentGlyph?.componentRefKeys).toEqual(['project-rename\0A.alt'])
  })

  it('keeps project clean when autosaving only glyph geometry changes', async () => {
    await saveProjectDraft({
      id: 'project-glyph-only',
      title: 'Glyph Only',
      lastModified: 20,
      createdAt: 10,
      updatedAt: 20,
      sourceName: 'GlyphOnly.ufo',
      sourceType: 'local',
      fontData,
      projectMetadata: null,
      projectSourceData: null,
      projectSourceFormat: 'ufo',
    })

    const nextFontData: FontData = {
      ...fontData,
      glyphs: {
        A: {
          ...fontData.glyphs.A,
          layers: {
            'public.default': {
              ...fontData.glyphs.A.layers!['public.default']!,
              metrics: { width: 620, lsb: 0, rsb: 620 },
            },
          },
        },
      },
    }

    await saveDraftSnapshot({
      projectId: 'project-glyph-only',
      projectTitle: 'Glyph Only',
      fontData: nextFontData,
      dirtyGlyphIds: ['A'],
      deletedGlyphIds: [],
      glyphEditTimes: { A: 40 },
      selectedLayerId: 'public.default',
    })

    const [project, glyphA] = await Promise.all([
      loadKumikoProjectRecord('project-glyph-only'),
      loadKumikoGlyphRecord(makeKumikoGlyphKey('project-glyph-only', 'A')),
    ])

    expect(project?.exportDirty).toBe(0)
    expect(project?.syncDirty).toBe(0)
    expect(glyphA?.exportDirty).toBe(1)
    expect(glyphA?.syncDirty).toBe(1)
  })
})

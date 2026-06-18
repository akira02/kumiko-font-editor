import {
  getProjectArchiveMetadata,
  getProjectArchiveSourceFormat,
} from 'src/lib/project/projectArchive'
import {
  fontDataToKumikoProjectRecord,
  glyphDataToKumikoGlyphRecord,
} from 'src/lib/project/kumikoFontDataAdapter'
import {
  loadKumikoGlyphRecord,
  loadKumikoProjectRecord,
  loadKumikoUiValue,
  makeKumikoGlyphKey,
  patchKumikoProjectData,
} from 'src/lib/project/kumikoProjectPersistence'
import type { FontData } from 'src/store'
import type { GlyphEditTimes } from 'src/lib/glyph/glyphEditTimes'
import {
  UFO_GLYPH_EDIT_TIMES_KEY,
  withProjectGlyphEditTimes,
} from 'src/lib/glyph/glyphEditTimes'

export const saveDraftSnapshot = async (input: {
  projectId: string
  projectTitle: string
  fontData: FontData
  dirtyGlyphIds: string[]
  deletedGlyphIds: string[]
  glyphEditTimes: GlyphEditTimes
  selectedLayerId: string | null
}) => {
  const persistedProject = await loadKumikoProjectRecord(input.projectId)
  const projectSourceFormat =
    getProjectArchiveSourceFormat() ?? persistedProject?.sourceFormat ?? null
  const projectMetadata =
    (await loadKumikoUiValue<Record<string, unknown>>(
      input.projectId,
      'projectMetadata'
    )) ?? getProjectArchiveMetadata()
  const now = Date.now()

  const projectChanged =
    input.dirtyGlyphIds.length > 0 ||
    input.deletedGlyphIds.length > 0 ||
    Boolean(persistedProject)
  const project = fontDataToKumikoProjectRecord({
    projectId: input.projectId,
    title: input.projectTitle,
    fontData: input.fontData,
    createdAt: persistedProject?.createdAt ?? now,
    updatedAt: now,
    sourceName: persistedProject?.sourceName ?? null,
    sourceType: persistedProject?.sourceType ?? 'local',
    sourceFormat: projectSourceFormat,
    githubSource: persistedProject?.githubSource ?? null,
    sourceData: persistedProject?.sourceData,
    exportDirty: Boolean(persistedProject?.exportDirty) || projectChanged,
    syncDirty: Boolean(persistedProject?.syncDirty) || projectChanged,
  })
  project.exportedDigest = persistedProject?.exportedDigest ?? null
  project.syncedDigest = persistedProject?.syncedDigest ?? null

  const glyphsToSave = await Promise.all(
    [...new Set(input.dirtyGlyphIds)]
      .map((glyphId) => input.fontData.glyphs[glyphId])
      .filter((glyph): glyph is NonNullable<typeof glyph> => Boolean(glyph))
      .map(async (glyph) => {
        const existing = await loadKumikoGlyphRecord(
          makeKumikoGlyphKey(input.projectId, glyph.id)
        )
        const record = glyphDataToKumikoGlyphRecord({
          projectId: input.projectId,
          glyph,
          updatedAt: now,
          exportDirty: true,
          syncDirty: true,
        })
        return {
          ...record,
          exportedDigest: existing?.exportedDigest ?? null,
          syncedDigest: existing?.syncedDigest ?? null,
        }
      })
  )

  await patchKumikoProjectData({
    project,
    glyphsToSave,
    glyphKeysToDelete: [...new Set(input.deletedGlyphIds)].map((glyphId) =>
      makeKumikoGlyphKey(input.projectId, glyphId)
    ),
    uiStateToSave: [
      {
        projectId: input.projectId,
        key: UFO_GLYPH_EDIT_TIMES_KEY,
        value: input.glyphEditTimes,
      },
      {
        projectId: input.projectId,
        key: 'projectMetadata',
        value: withProjectGlyphEditTimes(projectMetadata, input.glyphEditTimes),
      },
    ],
  })
}

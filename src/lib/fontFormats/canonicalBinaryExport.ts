import {
  exportGlyphListAsBinary,
  type BinaryFontExportFormat,
} from 'src/lib/fontFormats/fontBinaryFormat'
import {
  listKumikoGlyphMetadataForProject,
  loadKumikoGlyphRecords,
  loadKumikoProjectRecord,
  makeKumikoGlyphKey,
} from 'src/lib/project/kumikoProjectPersistence'
import {
  kumikoGlyphRecordToGlyphData,
  kumikoRecordsToFontData,
} from 'src/lib/project/kumikoFontDataAdapter'
import {
  bakeStaticInstanceGlyphs,
  formatStaticInstanceBakeError,
} from 'src/font/staticInstance'
import type { GlyphData } from 'src/store'

const BINARY_EXPORT_GLYPH_BATCH_SIZE = 256

const getCanonicalBinaryExportGlyphIds = async (
  projectId: string,
  glyphOrder: string[]
) => {
  const metadataRecords = await listKumikoGlyphMetadataForProject(projectId)
  const metadataByGlyphId = new Map(
    metadataRecords.map((record) => [record.glyphId, record])
  )
  const orderedGlyphIds = new Set<string>()
  const appendGlyphId = (glyphId: string) => {
    if (metadataByGlyphId.has(glyphId)) {
      orderedGlyphIds.add(glyphId)
    }
  }

  appendGlyphId('.notdef')
  glyphOrder.forEach(appendGlyphId)
  metadataRecords.forEach((record) => appendGlyphId(record.glyphId))

  return [...orderedGlyphIds]
}

const loadCanonicalGlyphs = async (
  projectId: string,
  glyphIds: string[],
  batchSize = BINARY_EXPORT_GLYPH_BATCH_SIZE
) => {
  const glyphs: GlyphData[] = []
  for (let index = 0; index < glyphIds.length; index += batchSize) {
    const batchGlyphIds = glyphIds.slice(index, index + batchSize)
    const records = await loadKumikoGlyphRecords(
      batchGlyphIds.map((glyphId) => makeKumikoGlyphKey(projectId, glyphId))
    )
    const recordsByGlyphId = new Map(
      records.map((record) => [record.glyphId, record])
    )
    glyphs.push(
      ...batchGlyphIds
        .map((glyphId) => recordsByGlyphId.get(glyphId))
        .filter((record): record is NonNullable<typeof record> =>
          Boolean(record)
        )
        .map(kumikoGlyphRecordToGlyphData)
    )
  }
  return glyphs
}

export const exportCanonicalProjectAsBinary = async (input: {
  projectId: string
  format: BinaryFontExportFormat
  batchSize?: number
}) => {
  const project = await loadKumikoProjectRecord(input.projectId)
  if (!project) {
    throw new Error('找不到 Kumiko 專案')
  }

  const glyphIds = await getCanonicalBinaryExportGlyphIds(
    input.projectId,
    project.glyphOrder
  )
  const glyphs = await loadCanonicalGlyphs(
    input.projectId,
    glyphIds,
    input.batchSize
  )

  return exportGlyphListAsBinary({
    fontData: kumikoRecordsToFontData(project, [], { metadataOnly: true }),
    glyphs,
    format: input.format,
  })
}

export const exportCanonicalProjectInstanceAsBinary = async (input: {
  projectId: string
  format: BinaryFontExportFormat
  instanceId: string
  batchSize?: number
}) => {
  const project = await loadKumikoProjectRecord(input.projectId)
  if (!project) {
    throw new Error('找不到 Kumiko 專案')
  }

  const instance = project.exportInstances?.find(
    (item) => item.id === input.instanceId
  )
  if (!instance) {
    throw new Error('找不到指定的 export instance')
  }

  const glyphIds = await getCanonicalBinaryExportGlyphIds(
    input.projectId,
    project.glyphOrder
  )
  const glyphs = await loadCanonicalGlyphs(
    input.projectId,
    glyphIds,
    input.batchSize
  )
  const fontData = kumikoRecordsToFontData(project, [], { metadataOnly: true })
  const baked = bakeStaticInstanceGlyphs({
    fontData,
    glyphs,
    instance,
  })

  if (baked.errors.length > 0) {
    throw new Error(formatStaticInstanceBakeError(instance, baked.errors))
  }

  return exportGlyphListAsBinary({
    fontData,
    glyphs: baked.glyphs,
    format: input.format,
    familyName: instance.familyName,
    styleName: instance.styleName || instance.name,
  })
}

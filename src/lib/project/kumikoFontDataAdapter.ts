import type {
  KumikoGlyphLayerRecord,
  KumikoGlyphRecord,
  KumikoGlyphStoreRecord,
  KumikoProjectRecord,
  KumikoProjectSourceFormat,
} from 'src/lib/project/kumikoProjectTypes'
import type { FontData, GlyphData, GlyphLayerData } from 'src/store'

export const normalizeUnicodeHex = (
  value: string | number | null | undefined
) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const raw =
    typeof value === 'number'
      ? value.toString(16)
      : value.trim().replace(/^U\+/i, '')
  if (!raw) {
    return null
  }
  const parsed = Number.parseInt(raw, 16)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return parsed.toString(16).toUpperCase().padStart(4, '0')
}

const getGlyphUnicodes = (glyph: GlyphData) => {
  const values = glyph.unicodes ?? (glyph.unicode ? [glyph.unicode] : [])
  const normalized = values
    .map((unicode) => normalizeUnicodeHex(unicode))
    .filter((unicode): unicode is string => Boolean(unicode))
  return [...new Set(normalized)]
}

const toKumikoLayerRecord = (
  layer: GlyphLayerData
): KumikoGlyphLayerRecord => ({
  id: layer.id,
  name: layer.name,
  type: layer.type ?? 'master',
  associatedMasterId: layer.associatedMasterId,
  paths: layer.paths,
  componentRefs: layer.componentRefs,
  anchors: layer.anchors,
  guidelines: layer.guidelines,
  metrics: layer.metrics,
  verticalMetrics: layer.verticalMetrics,
  color: layer.color,
  visible: layer.visible,
  locked: layer.locked,
  background: layer.background,
  image: layer.image,
  customData: layer.customData,
  sourceData: layer.sourceData,
})

export const fontDataToKumikoProjectRecord = (input: {
  projectId: string
  title: string
  fontData: FontData
  createdAt: number
  updatedAt: number
  sourceName?: string | null
  sourceType?: 'local' | 'github'
  sourceFormat?: KumikoProjectSourceFormat | null
  githubSource?: KumikoProjectRecord['githubSource']
  sourceData?: KumikoProjectRecord['sourceData']
  exportDirty?: boolean
  syncDirty?: boolean
}): KumikoProjectRecord => ({
  schemaVersion: 1,
  projectId: input.projectId,
  title: input.title,
  createdAt: input.createdAt,
  updatedAt: input.updatedAt,
  sourceName: input.sourceName ?? null,
  sourceType: input.sourceType ?? 'local',
  sourceFormat: input.sourceFormat ?? null,
  githubSource: input.githubSource ?? null,
  fontInfo: input.fontData.fontInfo,
  unitsPerEm: input.fontData.unitsPerEm,
  axes: input.fontData.axes,
  sources: input.fontData.sources,
  exportInstances: input.fontData.exportInstances,
  features: input.fontData.features,
  openTypeFeatures: input.fontData.openTypeFeatures,
  kerningGroups: input.fontData.kerningGroups,
  kerningPairs: input.fontData.kerningPairs,
  statusDefinitions: input.fontData.statusDefinitions,
  settings: input.fontData.settings,
  lineMetricsHorizontalLayout: input.fontData.lineMetricsHorizontalLayout,
  glyphOrder: input.fontData.glyphOrder ?? Object.keys(input.fontData.glyphs),
  exportDirty: input.exportDirty ? 1 : 0,
  syncDirty: input.syncDirty ? 1 : 0,
  sourceData: input.sourceData,
})

export const glyphDataToKumikoGlyphRecord = (input: {
  projectId: string
  glyph: GlyphData
  updatedAt: number
  exportDirty?: boolean
  syncDirty?: boolean
}): KumikoGlyphRecord => {
  const layers = Object.fromEntries(
    Object.entries(input.glyph.layers ?? {}).map(([layerId, layer]) => [
      layerId,
      toKumikoLayerRecord(layer),
    ])
  )
  const exportDirty = input.exportDirty ?? false
  const syncDirty = input.syncDirty ?? false
  const unicodes = getGlyphUnicodes(input.glyph)

  return {
    schemaVersion: 1,
    projectId: input.projectId,
    glyphId: input.glyph.id,
    displayName: input.glyph.displayName ?? null,
    unicodes,
    production: input.glyph.production,
    export: input.glyph.export,
    category: input.glyph.category,
    subCategory: input.glyph.subCategory,
    color: input.glyph.color,
    note: input.glyph.note,
    leftMetricsKey: input.glyph.leftMetricsKey,
    rightMetricsKey: input.glyph.rightMetricsKey,
    widthMetricsKey: input.glyph.widthMetricsKey,
    activeLayerId: input.glyph.activeLayerId,
    layerOrder: input.glyph.layerOrder ?? Object.keys(layers),
    layers,
    customData: input.glyph.customData,
    sourceData: input.glyph.sourceData,
    deleted: 0,
    exportDirty: exportDirty ? 1 : 0,
    syncDirty: syncDirty ? 1 : 0,
    updatedAt: input.updatedAt,
  }
}

export const fontDataToKumikoGlyphRecords = (input: {
  projectId: string
  fontData: FontData
  updatedAt: number
  exportDirtyGlyphIds?: Iterable<string>
  syncDirtyGlyphIds?: Iterable<string>
}): KumikoGlyphRecord[] => {
  const exportDirtyGlyphIds = new Set(input.exportDirtyGlyphIds ?? [])
  const syncDirtyGlyphIds = new Set(input.syncDirtyGlyphIds ?? [])
  return Object.values(input.fontData.glyphs).map((glyph) =>
    glyphDataToKumikoGlyphRecord({
      projectId: input.projectId,
      glyph,
      updatedAt: input.updatedAt,
      exportDirty: exportDirtyGlyphIds.has(glyph.id),
      syncDirty: syncDirtyGlyphIds.has(glyph.id),
    })
  )
}

const toGlyphLayerData = (layer: KumikoGlyphLayerRecord): GlyphLayerData => ({
  id: layer.id,
  name: layer.name,
  type: layer.type,
  associatedMasterId: layer.associatedMasterId,
  paths: layer.paths,
  components: layer.componentRefs.map((ref) => ref.glyphId),
  componentRefs: layer.componentRefs,
  anchors: layer.anchors,
  guidelines: layer.guidelines,
  metrics: layer.metrics,
  verticalMetrics: layer.verticalMetrics,
  color: layer.color,
  visible: layer.visible,
  locked: layer.locked,
  background: layer.background,
  image: layer.image,
  customData: layer.customData,
  sourceData: layer.sourceData,
})

export const kumikoGlyphRecordToGlyphData = (
  record: KumikoGlyphRecord
): GlyphData => {
  const layers = Object.fromEntries(
    Object.entries(record.layers).map(([layerId, layer]) => [
      layerId,
      toGlyphLayerData(layer),
    ])
  )

  return {
    id: record.glyphId,
    name: record.displayName ?? record.glyphId,
    displayName: record.displayName,
    activeLayerId: record.activeLayerId,
    layerOrder: record.layerOrder,
    layers,
    unicodes: record.unicodes,
    unicode: record.unicodes[0] ?? null,
    production: record.production,
    export: record.export,
    category: record.category,
    subCategory: record.subCategory,
    color: record.color,
    note: record.note,
    leftMetricsKey: record.leftMetricsKey,
    rightMetricsKey: record.rightMetricsKey,
    widthMetricsKey: record.widthMetricsKey,
    customData: record.customData,
    sourceData: record.sourceData,
  }
}

export const kumikoRecordsToFontData = (
  project: KumikoProjectRecord,
  glyphRecords: KumikoGlyphStoreRecord[]
): FontData => ({
  glyphs: Object.fromEntries(
    glyphRecords
      .filter((record): record is KumikoGlyphRecord => !record.deleted)
      .map((record) => [record.glyphId, kumikoGlyphRecordToGlyphData(record)])
  ),
  glyphOrder: project.glyphOrder,
  fontInfo: project.fontInfo,
  unitsPerEm: project.unitsPerEm,
  axes: project.axes,
  sources: project.sources,
  exportInstances: project.exportInstances,
  features: project.features,
  openTypeFeatures: project.openTypeFeatures,
  kerningGroups: project.kerningGroups,
  kerningPairs: project.kerningPairs,
  statusDefinitions: project.statusDefinitions,
  settings: project.settings,
  lineMetricsHorizontalLayout: project.lineMetricsHorizontalLayout,
})

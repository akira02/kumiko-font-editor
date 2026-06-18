import type { GitHubSyncTarget } from 'src/lib/github/sync/types'
import type { GitHubProjectSource } from 'src/lib/project/projectTypes'
import type { Designspace } from 'src/lib/fontFormats/designspace'
import type {
  DevelopmentStatusDefinition,
  FontAxes,
  FontData,
  FontExportInstance,
  FontInfo,
  FontProjectSettings,
  FontSource,
  GlyphImage,
  GlyphLayerData,
  KerningGroup,
  KerningPair,
  OpenTypeFeatures,
  OpenTypeFeaturesState,
} from 'src/store'

export type KumikoProjectSourceFormat =
  | 'glyphs'
  | 'glyphspackage'
  | 'ufo'
  | 'designspace'
  | 'ttf'
  | 'otf'
  | 'woff'
  | 'woff2'

export interface KumikoProjectSourceData {
  glyphs?: {
    formatVersion?: 2 | 3
    packageName?: string | null
    documentFields?: Record<string, unknown>
    fontMasterFields?: Record<string, Record<string, unknown>>
  }
  ufo?: {
    designspace?: Designspace | null
    ufos?: Array<{
      ufoId: string
      relativePath: string
      defaultLayerId: string
      layers: Array<{ layerId: string; glyphDir: string }>
      contents: Record<string, string>
      glyphOrder: string[]
      metainfo?: Record<string, unknown> | null
      fontinfoExtra?: Record<string, unknown> | null
      libExtra?: Record<string, unknown> | null
      groupsExtra?: Record<string, unknown> | null
      kerningExtra?: Record<string, unknown> | null
    }>
    lastSync?: GitHubSyncTarget | null
  }
  binary?: {
    format: 'ttf' | 'otf' | 'woff' | 'woff2'
  }
}

export interface KumikoProjectRecord {
  schemaVersion: 1
  projectId: string
  title: string
  createdAt: number
  updatedAt: number
  sourceName?: string | null
  sourceType?: 'local' | 'github'
  sourceFormat?: KumikoProjectSourceFormat | null
  githubSource?: GitHubProjectSource | null
  fontInfo?: FontInfo
  unitsPerEm?: number
  axes?: FontAxes
  sources?: Record<string, FontSource>
  exportInstances?: FontExportInstance[]
  features?: OpenTypeFeatures
  openTypeFeatures?: OpenTypeFeaturesState
  kerningGroups?: KerningGroup[]
  kerningPairs?: KerningPair[]
  statusDefinitions?: DevelopmentStatusDefinition[]
  settings?: FontProjectSettings
  lineMetricsHorizontalLayout?: FontData['lineMetricsHorizontalLayout']
  glyphOrder: string[]
  exportDirty: 0 | 1
  syncDirty: 0 | 1
  sourceData?: KumikoProjectSourceData
}

export interface KumikoLayerSourceData {
  glyphs?: {
    fields?: Record<string, unknown>
  }
  ufo?: {
    ufoId?: string
    layerId?: string
    glyphDir?: string
    fileName?: string
    sourceHash?: string | null
    remoteBlobSha?: string | null
    note?: string | null
    image?: GlyphImage | null
    lib?: Record<string, unknown> | null
  }
}

export interface KumikoGlyphLayerRecord extends Omit<
  GlyphLayerData,
  'components' | 'type' | 'sourceData'
> {
  type: 'master' | 'backup' | 'background'
  sourceData?: KumikoLayerSourceData
}

export interface KumikoGlyphSourceData {
  glyphs?: {
    fields?: Record<string, unknown>
  }
  ufo?: {
    fileName?: string
    sourceHash?: string | null
    remoteBlobSha?: string | null
  }
}

export interface KumikoGlyphRecord {
  schemaVersion: 1
  projectId: string
  // Stable canonical glyph name used by glyphOrder, components, UFO contents,
  // and Glyphs glyphname. User-facing labels belong in displayName.
  glyphId: string
  displayName?: string | null
  unicodes: string[]
  production?: string | null
  export?: boolean
  category?: string | null
  subCategory?: string | null
  color?: string | number | null
  note?: string | null
  leftMetricsKey?: string | null
  rightMetricsKey?: string | null
  widthMetricsKey?: string | null
  activeLayerId?: string | null
  layerOrder: string[]
  layers: Record<string, KumikoGlyphLayerRecord>
  customData?: Record<string, unknown>
  sourceData?: KumikoGlyphSourceData
  deleted: 0
  exportDirty: 0 | 1
  syncDirty: 0 | 1
  updatedAt: number
}

export interface KumikoGlyphTombstoneRecord {
  schemaVersion: 1
  projectId: string
  glyphId: string
  displayName?: string | null
  unicodes: string[]
  sourceData?: KumikoGlyphSourceData
  deleted: 1
  deletedAt: number
  exportDirty: 0 | 1
  syncDirty: 0 | 1
  updatedAt: number
}

export type KumikoGlyphStoreRecord =
  | KumikoGlyphRecord
  | KumikoGlyphTombstoneRecord

export interface KumikoUiStateRecord {
  projectId: string
  key: string
  value: unknown
}

export type KumikoGlyphPrimaryKey = [projectId: string, glyphId: string]

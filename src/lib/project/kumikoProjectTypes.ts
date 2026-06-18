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
  GlyphAnchor,
  GlyphComponentRef,
  GlyphGuideline,
  GlyphLayerContent,
  GlyphLayerData,
  GlyphMetrics,
  KerningGroup,
  KerningPair,
  OpenTypeFeatures,
  OpenTypeFeaturesState,
  PathData,
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
  sourceData?: KumikoProjectSourceData
}

export interface KumikoElementSourceData {
  glyphs?: Record<string, unknown>
  ufo?: Record<string, unknown>
}

export interface KumikoPathData extends PathData {
  identifier?: string | null
  name?: string | null
  color?: string | null
  customData?: Record<string, unknown>
  sourceData?: KumikoElementSourceData
}

export interface KumikoGlyphComponentRef extends GlyphComponentRef {
  identifier?: string | null
  name?: string | null
  color?: string | null
  customData?: Record<string, unknown>
  sourceData?: KumikoElementSourceData
}

export interface KumikoGlyphAnchor extends GlyphAnchor {
  identifier?: string | null
  color?: string | null
  customData?: Record<string, unknown>
  sourceData?: KumikoElementSourceData
}

export interface KumikoGlyphGuideline extends GlyphGuideline {
  identifier?: string | null
  color?: string | null
  customData?: Record<string, unknown>
  sourceData?: KumikoElementSourceData
}

export interface KumikoGlyphImage {
  fileName: string
  xScale?: number
  xyScale?: number
  yxScale?: number
  yScale?: number
  xOffset?: number
  yOffset?: number
  color?: string | null
  customData?: Record<string, unknown>
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
    image?: KumikoGlyphImage | null
    lib?: Record<string, unknown> | null
  }
}

export interface KumikoGlyphLayerRecord extends Omit<
  GlyphLayerData,
  'paths' | 'componentRefs' | 'anchors' | 'guidelines'
> {
  type: 'master' | 'backup' | 'background'
  paths: KumikoPathData[]
  componentRefs: KumikoGlyphComponentRef[]
  anchors: KumikoGlyphAnchor[]
  guidelines: KumikoGlyphGuideline[]
  metrics: GlyphMetrics
  verticalMetrics?: {
    height?: number | null
    tsb?: number | null
    bsb?: number | null
  }
  color?: string | number | null
  visible?: boolean
  locked?: boolean
  background?: GlyphLayerContent | null
  customData?: Record<string, unknown>
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
  glyphId: string
  name: string
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
  dirty: boolean
  dirtyIndex: 0 | 1
  updatedAt: number
}

export interface KumikoUiStateRecord {
  projectId: string
  key: string
  value: unknown
}

export type KumikoGlyphPrimaryKey = [projectId: string, glyphId: string]

import {
  extractGlyphsMetadata,
  type GlyphsDocument,
} from 'src/lib/fontFormats/glyphsDocument'
import { buildFontDataFromGlyphsDocument } from 'src/lib/fontFormats/glyphsImport'
import {
  readGlyphsPackageFromFiles,
  type GlyphsPackageData,
} from 'src/lib/fontFormats/glyphsPackage'
import { parseOpenStep } from 'src/lib/fontFormats/openstepParser'
import type { ProjectSourceFormat } from 'src/lib/project/projectFormats'
import type { FontData } from 'src/store'

export interface ImportedGlyphsProject {
  projectId: string
  title: string
  fontData: FontData
  projectMetadata: Record<string, unknown>
  projectSourceFormat: ProjectSourceFormat
  projectGlyphsText: string | null
  projectGlyphsDocument: GlyphsDocument | null
  projectGlyphsPackage: GlyphsPackageData | null
}

const stripExtension = (fileName: string) =>
  fileName.replace(/\.(glyphs|glyphspackage)$/i, '')

const familyTitle = (document: GlyphsDocument, fallback: string) =>
  typeof document.familyName === 'string' && document.familyName.length > 0
    ? document.familyName
    : fallback

// Single-file .glyphs: parse the OpenStep document, keep the raw text for
// patch-free full round-trip export, and build the multi-master FontData.
export const importGlyphsFile = async (
  file: File
): Promise<ImportedGlyphsProject> => {
  const text = await file.text()
  const document = parseOpenStep(text) as GlyphsDocument
  if (!document || typeof document !== 'object') {
    throw new Error('無法解析 .glyphs 檔案')
  }

  return {
    projectId: `glyphs-${Date.now()}`,
    title: familyTitle(document, stripExtension(file.name)),
    fontData: buildFontDataFromGlyphsDocument(document),
    projectMetadata: extractGlyphsMetadata(document) ?? {},
    projectSourceFormat: 'glyphs',
    projectGlyphsText: text,
    projectGlyphsDocument: document,
    projectGlyphsPackage: null,
  }
}

// .glyphspackage folder: readGlyphsPackageFromFiles already assembles the
// document (fontinfo.plist + per-glyph .glyph files in order); build FontData
// from it and keep the package files for round-trip export.
export const importGlyphsPackage = async (
  files: FileList | File[]
): Promise<ImportedGlyphsProject> => {
  const { document, packageData, projectMetadata } =
    await readGlyphsPackageFromFiles(files)

  return {
    projectId: `glyphs-${Date.now()}`,
    title: familyTitle(document, stripExtension(packageData.packageName)),
    fontData: buildFontDataFromGlyphsDocument(document),
    projectMetadata,
    projectSourceFormat: 'glyphspackage',
    projectGlyphsText: null,
    projectGlyphsDocument: document,
    projectGlyphsPackage: packageData,
  }
}

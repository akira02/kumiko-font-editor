import type { FontExportFormat } from 'src/features/common/fontExport/ExportFontModal'
import type { ProjectSourceFormat } from 'src/lib/project/projectFormats'

export const canUseCanonicalUfoZipExport = (
  sourceFormat: ProjectSourceFormat | null | undefined
) => sourceFormat === 'ufo' || sourceFormat === 'designspace'

export const shouldLoadFullDraftForExport = (
  formats: FontExportFormat[],
  sourceFormat: ProjectSourceFormat | null | undefined
) =>
  formats.some(
    (format) =>
      format !== 'glyphs2' &&
      format !== 'glyphs3' &&
      format !== 'glyphspackage' &&
      (format !== 'zip' || !canUseCanonicalUfoZipExport(sourceFormat))
  )

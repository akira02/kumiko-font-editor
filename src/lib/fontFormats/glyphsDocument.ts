export type OpenStepScalar = string | number | boolean | null
export type OpenStepValue =
  | OpenStepScalar
  | OpenStepValue[]
  | { [key: string]: OpenStepValue | undefined }

export type GlyphsDocument = {
  [key: string]: OpenStepValue | undefined
  glyphs?: Array<Record<string, OpenStepValue | undefined>>
  fontMaster?: Array<Record<string, OpenStepValue | undefined>>
  customParameters?: OpenStepValue[]
  featurePrefixes?: OpenStepValue[]
  classes?: OpenStepValue[]
  features?: OpenStepValue[]
  instances?: OpenStepValue[]
}

export const cloneGlyphsDocument = <T extends OpenStepValue>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export const extractGlyphsMetadata = (
  document: GlyphsDocument | null | undefined
): Record<string, unknown> | null => {
  if (!document) {
    return null
  }

  return {
    familyName: document.familyName ?? null,
    unitsPerEm: document.unitsPerEm ?? null,
    versionMajor: document.versionMajor ?? null,
    versionMinor: document.versionMinor ?? null,
    customParameters: document.customParameters ?? null,
    featurePrefixes: document.featurePrefixes ?? null,
    classes: document.classes ?? null,
    features: document.features ?? null,
    instances: document.instances ?? null,
    fontMasters: document.fontMaster ?? null,
  }
}

const GLYPHS_DOCUMENT_VECTOR_KEYS = new Set(['glyphs'])

export const extractGlyphsDocumentFields = (
  document: GlyphsDocument | null | undefined
): Record<string, unknown> | undefined => {
  if (!document) {
    return undefined
  }
  const entries = Object.entries(document).filter(
    ([key, value]) =>
      !GLYPHS_DOCUMENT_VECTOR_KEYS.has(key) &&
      key !== 'fontMaster' &&
      value !== undefined
  )
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export const extractGlyphsFontMasterFields = (
  document: GlyphsDocument | null | undefined
): Record<string, Record<string, unknown>> | undefined => {
  const masters = Array.isArray(document?.fontMaster) ? document.fontMaster : []
  const entries = masters.flatMap((master, index) => {
    const id =
      typeof master.id === 'string'
        ? master.id
        : typeof master.name === 'string'
          ? master.name
          : `master-${index}`
    const fields = Object.fromEntries(
      Object.entries(master).filter(([, value]) => value !== undefined)
    )
    return Object.keys(fields).length > 0 ? [[id, fields] as const] : []
  })
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export const getGlyphsFormatVersion = (
  document: GlyphsDocument | null | undefined
): 2 | 3 => (Number(document?.['.formatVersion']) >= 3 ? 3 : 2)

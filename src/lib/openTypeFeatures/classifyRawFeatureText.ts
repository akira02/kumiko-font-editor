import { RAW_FEATURE_TEXT_SOURCE_ID } from 'src/lib/openTypeFeatures/featureSourceSections'
import { toStableIdPart } from 'src/lib/openTypeFeatures/ids'
import type {
  FeatureDiagnostic,
  FeatureOrigin,
  FeatureRecord,
  GlyphClass,
  GlyphSelector,
  LanguageSystem,
  LookupFlagIR,
  LookupOrigin,
  LookupRecord,
  OpenTypeFeaturesState,
  Rule,
  ValueRecord,
} from 'src/lib/openTypeFeatures/types'

type RawFeatureTextOrigin = 'manual-input' | 'ufo-import'

interface ClassifyRawFeatureTextOptions {
  origin?: RawFeatureTextOrigin
}

interface ParsedLookup {
  id: string
  name: string
  table: LookupRecord['table']
  lookupType: LookupRecord['lookupType']
  lookupFlag: LookupFlagIR
  rules: Rule[]
}

interface ParsedRawFeatureText {
  languageSystems: LanguageSystem[]
  glyphClasses: GlyphClass[]
  lookups: LookupRecord[]
  features: FeatureRecord[]
  unsupportedStatements: string[]
}

const RAW_FEATURE_DIAGNOSTIC_PREFIX =
  'feature-diagnostic-warning-raw-fea-parser'

const getFeatureOrigin = (origin: RawFeatureTextOrigin): FeatureOrigin =>
  origin === 'ufo-import' ? 'imported' : 'manual'

const getLookupOrigin = (origin: RawFeatureTextOrigin): LookupOrigin =>
  origin === 'ufo-import' ? 'imported' : 'manual'

const stripComments = (text: string) =>
  text
    .split('\n')
    .map((line) => line.replace(/#.*/, ''))
    .join('\n')

const blankRange = (text: string, start: number, end: number) =>
  `${text.slice(0, start)}${' '.repeat(end - start)}${text.slice(end)}`

const makeRawDiagnostic = (
  unsupportedStatements: string[]
): FeatureDiagnostic => ({
  id: `${RAW_FEATURE_DIAGNOSTIC_PREFIX}-unsupported-statements`,
  severity: 'warning',
  message: `Raw .fea source contains ${unsupportedStatements.length} statement${
    unsupportedStatements.length === 1 ? '' : 's'
  } that Kumiko cannot classify yet. The raw source is preserved for export.`,
  target: { kind: 'global' },
})

const splitStatements = (body: string) =>
  body
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

const splitGlyphList = (body: string) =>
  body
    .split(/\s+/)
    .map((glyph) => glyph.trim())
    .filter(Boolean)

const makeLanguageSystemId = (script: string, language: string) =>
  `languagesystem_${toStableIdPart(script)}_${toStableIdPart(language)}`

const makeGlyphClassId = (name: string) =>
  `glyph_class_raw_${toStableIdPart(name.replace(/^@/, ''))}`

const selectorFromToken = (
  token: string,
  glyphClassIdByName: Map<string, string>
): GlyphSelector | null => {
  if (token.startsWith('@')) {
    const classId = glyphClassIdByName.get(token)
    return classId ? { kind: 'class', classId } : null
  }

  if (token.includes("'")) return null
  return { kind: 'glyph', glyph: token }
}

const parseValueRecord = (value: string): ValueRecord | null => {
  if (/^-?\d+$/.test(value)) {
    return { xAdvance: Number(value) }
  }

  const match = value.match(/^<\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*>$/)
  if (!match) return null

  return {
    xPlacement: Number(match[1]),
    yPlacement: Number(match[2]),
    xAdvance: Number(match[3]),
    yAdvance: Number(match[4]),
  }
}

const parseLookupFlagStatement = (statement: string): LookupFlagIR | null => {
  const match = statement.match(/^lookupflag\s+(.+)$/i)
  if (!match) return null

  const value = match[1]
  return {
    rightToLeft: /\bRightToLeft\b/i.test(value) || undefined,
    ignoreBaseGlyphs: /\bIgnoreBaseGlyphs\b/i.test(value) || undefined,
    ignoreLigatures: /\bIgnoreLigatures\b/i.test(value) || undefined,
    ignoreMarks: /\bIgnoreMarks\b/i.test(value) || undefined,
  }
}

const parseSubstitutionRule = (
  statement: string,
  ruleId: string,
  origin: FeatureOrigin,
  glyphClassIdByName: Map<string, string>
): Rule | null => {
  const match = statement.match(/^sub\s+(.+?)\s+by\s+(\S+)$/i)
  if (!match) return null

  const pattern = match[1].trim().split(/\s+/).filter(Boolean)
  const replacement = match[2]
  if (pattern.length === 0 || replacement.startsWith('@')) return null

  if (pattern.length === 1) {
    const target = selectorFromToken(pattern[0], glyphClassIdByName)
    return target
      ? {
          id: ruleId,
          kind: 'singleSubstitution',
          target,
          replacement,
          meta: {
            origin,
            provenance: { table: 'GSUB' },
          },
        }
      : null
  }

  if (pattern.some((token) => token.startsWith('@') || token.includes("'"))) {
    return null
  }

  return {
    id: ruleId,
    kind: 'ligatureSubstitution',
    components: pattern,
    replacement,
    meta: {
      origin,
      provenance: { table: 'GSUB' },
    },
  }
}

const parsePositioningRule = (
  statement: string,
  ruleId: string,
  origin: FeatureOrigin,
  glyphClassIdByName: Map<string, string>
): Rule | null => {
  const match = statement.match(/^pos\s+(\S+)\s+(.+)$/i)
  if (!match) return null

  const left = selectorFromToken(match[1], glyphClassIdByName)
  if (!left) return null

  const rest = match[2].trim()
  const singleValue = parseValueRecord(rest)
  if (singleValue) {
    return {
      id: ruleId,
      kind: 'singlePositioning',
      target: left,
      value: singleValue,
      meta: {
        origin,
        provenance: { table: 'GPOS' },
      },
    }
  }

  const pairMatch = rest.match(/^(\S+)\s+(-?\d+|<[^>]+>)$/)
  if (!pairMatch) return null

  const right = selectorFromToken(pairMatch[1], glyphClassIdByName)
  const firstValue = parseValueRecord(pairMatch[2])
  if (!right || !firstValue) return null

  return {
    id: ruleId,
    kind: 'pairPositioning',
    left,
    right,
    firstValue,
    meta: {
      origin,
      provenance: { table: 'GPOS' },
    },
  }
}

const getLookupShape = (rules: Rule[]) => {
  const firstRule = rules[0]
  if (!firstRule) return null

  const lookupTypeByRuleKind: Partial<
    Record<Rule['kind'], LookupRecord['lookupType']>
  > = {
    singleSubstitution: 'singleSubst',
    ligatureSubstitution: 'ligatureSubst',
    singlePositioning: 'singlePos',
    pairPositioning: 'pairPos',
  }
  const lookupType = lookupTypeByRuleKind[firstRule.kind]
  if (!lookupType) return null

  const table: LookupRecord['table'] =
    firstRule.kind === 'singlePositioning' ||
    firstRule.kind === 'pairPositioning'
      ? 'GPOS'
      : 'GSUB'
  const allSameShape = rules.every(
    (rule) => lookupTypeByRuleKind[rule.kind] === lookupType
  )
  if (!allSameShape) return null

  return { table, lookupType }
}

const parseLookupStatements = (
  body: string,
  idPrefix: string,
  origin: FeatureOrigin,
  glyphClassIdByName: Map<string, string>
) => {
  const rules: Rule[] = []
  const unsupportedStatements: string[] = []
  let lookupFlag: LookupFlagIR = {}

  for (const [index, statement] of splitStatements(body).entries()) {
    const lookupFlagStatement = parseLookupFlagStatement(statement)
    if (lookupFlagStatement) {
      lookupFlag = { ...lookupFlag, ...lookupFlagStatement }
      continue
    }

    const ruleId = `${idPrefix}_rule_${index}`
    const rule =
      parseSubstitutionRule(statement, ruleId, origin, glyphClassIdByName) ??
      parsePositioningRule(statement, ruleId, origin, glyphClassIdByName)

    if (rule) {
      rules.push(rule)
    } else {
      unsupportedStatements.push(statement)
    }
  }

  return { rules, lookupFlag, unsupportedStatements }
}

const toLookupRecord = (
  lookup: ParsedLookup,
  origin: LookupOrigin
): LookupRecord => ({
  id: lookup.id,
  name: lookup.name,
  table: lookup.table,
  lookupType: lookup.lookupType,
  lookupFlag: lookup.lookupFlag,
  rules: lookup.rules,
  editable: true,
  origin,
  meta: {
    sourceSectionId: RAW_FEATURE_TEXT_SOURCE_ID,
    classifiedFromRawFeatureText: true,
  },
})

const parseRawFeatureText = (
  rawFeatureText: string,
  sourceOrigin: RawFeatureTextOrigin
): ParsedRawFeatureText => {
  const featureOrigin = getFeatureOrigin(sourceOrigin)
  const lookupOrigin = getLookupOrigin(sourceOrigin)
  const glyphClasses: GlyphClass[] = []
  const lookups: LookupRecord[] = []
  const features: FeatureRecord[] = []
  const languageSystems = new Map<string, LanguageSystem>()
  const unsupportedStatements: string[] = []
  const glyphClassIdByName = new Map<string, string>()
  let workingText = stripComments(rawFeatureText)

  for (const match of workingText.matchAll(
    /@([A-Za-z0-9_.-]+)\s*=\s*\[([^\]]*)\]\s*;/g
  )) {
    const className = `@${match[1]}`
    const glyphs = splitGlyphList(match[2])
    const classId = makeGlyphClassId(className)
    glyphClassIdByName.set(className, classId)
    glyphClasses.push({
      id: classId,
      name: className,
      glyphs,
      origin: featureOrigin,
      meta: {
        sourceSectionId: RAW_FEATURE_TEXT_SOURCE_ID,
        classifiedFromRawFeatureText: true,
      },
    })
    workingText = blankRange(
      workingText,
      match.index ?? 0,
      (match.index ?? 0) + match[0].length
    )
  }

  for (const match of workingText.matchAll(
    /\blanguagesystem\s+([A-Za-z]{4})\s+([A-Za-z0-9_.-]{4})\s*;/g
  )) {
    const languageSystem: LanguageSystem = {
      id: makeLanguageSystemId(match[1], match[2]),
      script: match[1],
      language: match[2],
    }
    languageSystems.set(languageSystem.id, languageSystem)
    workingText = blankRange(
      workingText,
      match.index ?? 0,
      (match.index ?? 0) + match[0].length
    )
  }

  for (const match of workingText.matchAll(
    /\blookup\s+([A-Za-z_][A-Za-z0-9_.-]*)\s*\{([\s\S]*?)\}\s*\1\s*;/g
  )) {
    const name = match[1]
    const id = `lookup_raw_${toStableIdPart(name)}`
    const parsed = parseLookupStatements(
      match[2],
      id,
      featureOrigin,
      glyphClassIdByName
    )
    const shape = getLookupShape(parsed.rules)
    if (parsed.unsupportedStatements.length > 0 || !shape) {
      unsupportedStatements.push(match[0].trim())
    } else {
      lookups.push(
        toLookupRecord(
          {
            id,
            name,
            table: shape.table,
            lookupType: shape.lookupType,
            lookupFlag: parsed.lookupFlag,
            rules: parsed.rules,
          },
          lookupOrigin
        )
      )
    }
    workingText = blankRange(
      workingText,
      match.index ?? 0,
      (match.index ?? 0) + match[0].length
    )
  }

  const lookupByName = new Map(lookups.map((lookup) => [lookup.name, lookup]))
  for (const match of workingText.matchAll(
    /\bfeature\s+([A-Za-z0-9]{4})\s*\{([\s\S]*?)\}\s*\1\s*;/g
  )) {
    const tag = match[1]
    let featureBody = match[2]
    const scripts = [...featureBody.matchAll(/\bscript\s+([A-Za-z]{4})\s*;/g)]
    const languages = [
      ...featureBody.matchAll(/\blanguage\s+([A-Za-z0-9_.-]{4})\s*;/g),
    ]
    const script = scripts[0]?.[1] ?? 'DFLT'
    const language = languages[0]?.[1] ?? 'dflt'
    const lookupIds: string[] = []

    for (const lookupRef of featureBody.matchAll(
      /\blookup\s+([A-Za-z_][A-Za-z0-9_.-]*)\s*;/g
    )) {
      const lookup = lookupByName.get(lookupRef[1])
      if (lookup) {
        lookupIds.push(lookup.id)
      } else {
        unsupportedStatements.push(lookupRef[0].trim())
      }
    }

    featureBody = featureBody
      .replace(/\bscript\s+[A-Za-z]{4}\s*;/g, '')
      .replace(/\blanguage\s+[A-Za-z0-9_.-]{4}\s*;/g, '')
      .replace(/\blookup\s+[A-Za-z_][A-Za-z0-9_.-]*\s*;/g, '')

    if (/\blookup\s+[A-Za-z_][A-Za-z0-9_.-]*\s*\{/.test(featureBody)) {
      unsupportedStatements.push(match[0].trim())
    } else {
      const inlineLookupId = `lookup_raw_${toStableIdPart(tag)}_${features.length}`
      const parsed = parseLookupStatements(
        featureBody,
        inlineLookupId,
        featureOrigin,
        glyphClassIdByName
      )
      const shape = getLookupShape(parsed.rules)
      if (parsed.unsupportedStatements.length > 0) {
        unsupportedStatements.push(...parsed.unsupportedStatements)
      }
      if (shape && parsed.rules.length > 0) {
        const inlineLookup = toLookupRecord(
          {
            id: inlineLookupId,
            name: `raw_${tag}_${features.length}`,
            table: shape.table,
            lookupType: shape.lookupType,
            lookupFlag: parsed.lookupFlag,
            rules: parsed.rules,
          },
          lookupOrigin
        )
        lookups.push(inlineLookup)
        lookupIds.push(inlineLookup.id)
      }
    }

    const languageSystem = {
      id: makeLanguageSystemId(script, language),
      script,
      language,
    }
    languageSystems.set(languageSystem.id, languageSystem)
    features.push({
      id: `feature_raw_${toStableIdPart(tag)}`,
      tag,
      isActive: true,
      entries: [
        {
          id: `feature_entry_raw_${toStableIdPart(tag)}_${toStableIdPart(script)}_${toStableIdPart(language)}`,
          script,
          language,
          lookupIds,
        },
      ],
      origin: featureOrigin,
      meta: {
        sourceSectionId: RAW_FEATURE_TEXT_SOURCE_ID,
        classifiedFromRawFeatureText: true,
      },
    })
    workingText = blankRange(
      workingText,
      match.index ?? 0,
      (match.index ?? 0) + match[0].length
    )
  }

  const leftovers = splitStatements(workingText)
  unsupportedStatements.push(...leftovers)

  return {
    languageSystems: [...languageSystems.values()],
    glyphClasses,
    lookups,
    features,
    unsupportedStatements,
  }
}

const recordIdsFor = (
  state: OpenTypeFeaturesState,
  kind: 'languageSystem' | 'feature' | 'lookup' | 'glyphClass'
) =>
  new Set(
    (state.sourceSections ?? [])
      .find((section) => section.id === RAW_FEATURE_TEXT_SOURCE_ID)
      ?.recordRefs.filter((ref) => ref.kind === kind)
      .map((ref) => ref.id) ?? []
  )

const removePreviousRawFeatureTextClassification = (
  state: OpenTypeFeaturesState
): OpenTypeFeaturesState => {
  const languageSystemIds = recordIdsFor(state, 'languageSystem')
  const featureIds = recordIdsFor(state, 'feature')
  const lookupIds = recordIdsFor(state, 'lookup')
  const glyphClassIds = recordIdsFor(state, 'glyphClass')

  return {
    ...state,
    languagesystems: state.languagesystems.filter(
      (languageSystem) => !languageSystemIds.has(languageSystem.id)
    ),
    features: state.features.filter((feature) => !featureIds.has(feature.id)),
    lookups: state.lookups.filter((lookup) => !lookupIds.has(lookup.id)),
    glyphClasses: state.glyphClasses.filter(
      (glyphClass) => !glyphClassIds.has(glyphClass.id)
    ),
    diagnostics: (state.diagnostics ?? []).filter(
      (diagnostic) => !diagnostic.id.startsWith(RAW_FEATURE_DIAGNOSTIC_PREFIX)
    ),
  }
}

const mergeById = <T extends { id: string }>(left: T[], right: T[]) => {
  const merged = new Map<string, T>()
  for (const item of left) merged.set(item.id, item)
  for (const item of right) merged.set(item.id, item)
  return [...merged.values()]
}

export const classifyRawFeatureTextSource = (
  state: OpenTypeFeaturesState,
  options: ClassifyRawFeatureTextOptions = {}
): OpenTypeFeaturesState => {
  const rawFeatureText = state.rawFeatureText?.trim()
  const baseState = removePreviousRawFeatureTextClassification(state)
  const sourceSections = baseState.sourceSections ?? []
  const sourceSection = sourceSections.find(
    (section) => section.id === RAW_FEATURE_TEXT_SOURCE_ID
  )
  if (!rawFeatureText || !sourceSection) {
    return baseState
  }

  const parsed = parseRawFeatureText(
    rawFeatureText,
    options.origin ??
      (sourceSection.origin === 'ufo-import' ? 'ufo-import' : 'manual-input')
  )
  const canCommitToModel =
    parsed.unsupportedStatements.length === 0 &&
    (parsed.features.length > 0 ||
      parsed.lookups.length > 0 ||
      parsed.glyphClasses.length > 0 ||
      parsed.languageSystems.length > 0)

  if (!canCommitToModel) {
    return {
      ...baseState,
      diagnostics:
        parsed.unsupportedStatements.length > 0
          ? [
              ...(baseState.diagnostics ?? []),
              makeRawDiagnostic(parsed.unsupportedStatements),
            ]
          : baseState.diagnostics,
      sourceSections: sourceSections.map((section) =>
        section.id === RAW_FEATURE_TEXT_SOURCE_ID
          ? {
              ...section,
              stage: 'source',
              status: 'raw',
              recordRefs: [],
              meta: {
                ...section.meta,
                classifiedIntoModel: false,
                preserveRawTextInGeneratedFea: true,
                unsupportedStatementCount: parsed.unsupportedStatements.length,
                unsupportedStatements: parsed.unsupportedStatements.slice(0, 5),
              },
            }
          : section
      ),
    }
  }

  const recordRefs = [
    ...parsed.languageSystems.map((languageSystem) => ({
      kind: 'languageSystem' as const,
      id: languageSystem.id,
    })),
    ...parsed.glyphClasses.map((glyphClass) => ({
      kind: 'glyphClass' as const,
      id: glyphClass.id,
    })),
    ...parsed.lookups.map((lookup) => ({
      kind: 'lookup' as const,
      id: lookup.id,
      table: lookup.table,
    })),
    ...parsed.features.map((feature) => ({
      kind: 'feature' as const,
      id: feature.id,
    })),
  ]

  return {
    ...baseState,
    languagesystems: mergeById(
      baseState.languagesystems,
      parsed.languageSystems
    ),
    glyphClasses: mergeById(baseState.glyphClasses, parsed.glyphClasses),
    lookups: mergeById(baseState.lookups, parsed.lookups),
    features: mergeById(baseState.features, parsed.features),
    sourceSections: sourceSections.map((section) =>
      section.id === RAW_FEATURE_TEXT_SOURCE_ID
        ? {
            ...section,
            stage: 'classified',
            status: 'classified',
            recordRefs,
            meta: {
              ...section.meta,
              classifiedIntoModel: true,
              preserveRawTextInGeneratedFea: false,
              parsedFeatureCount: parsed.features.length,
              parsedLookupCount: parsed.lookups.length,
              parsedGlyphClassCount: parsed.glyphClasses.length,
              parsedLanguageSystemCount: parsed.languageSystems.length,
            },
          }
        : section
    ),
  }
}

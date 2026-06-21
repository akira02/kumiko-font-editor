export type GlyphPackageGroup = 'zh-jf7000' | 'latin' | 'japanese' | 'symbols'

export interface DefaultGlyphPackage {
  id: string
  label: string
  description: string
  group: GlyphPackageGroup
  section: string
  dependsOn: string[]
  glyphNames: string[]
}

export interface DefaultGlyphPackageGroupInfo {
  id: GlyphPackageGroup
  label: string
}

export const defaultGlyphPackageGroups: DefaultGlyphPackageGroupInfo[] = [
  { id: 'zh-jf7000', label: '繁體中文' },
  { id: 'latin', label: '拉丁字母' },
  { id: 'japanese', label: '日文' },
  { id: 'symbols', label: '符號' },
]

export const defaultGlyphPackageGroupIds = defaultGlyphPackageGroups.map(
  (group) => group.id
)

export const firstDefaultGlyphPackageGroupId =
  defaultGlyphPackageGroups[0]?.id ?? 'zh-jf7000'

const packageGroupFetchCache = new Map<
  GlyphPackageGroup,
  Promise<DefaultGlyphPackage[]>
>()

const isGlyphPackageGroup = (value: string): value is GlyphPackageGroup =>
  defaultGlyphPackageGroupIds.includes(value as GlyphPackageGroup)

const normalizePackage = (
  value: DefaultGlyphPackage,
  groupId: GlyphPackageGroup
): DefaultGlyphPackage => ({
  ...value,
  group: isGlyphPackageGroup(value.group) ? value.group : groupId,
  dependsOn: Array.isArray(value.dependsOn) ? value.dependsOn : [],
  glyphNames: Array.isArray(value.glyphNames) ? value.glyphNames : [],
})

export const loadDefaultGlyphPackages = (
  groupId: GlyphPackageGroup
): Promise<DefaultGlyphPackage[]> => {
  const cached = packageGroupFetchCache.get(groupId)
  if (cached) {
    return cached
  }

  const request = fetch(`/glyph-packages/${groupId}.json`).then(
    async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to load glyph package group: ${groupId}`)
      }
      const payload = (await response.json()) as DefaultGlyphPackage[]
      return payload.map((glyphPackage) =>
        normalizePackage(glyphPackage, groupId)
      )
    }
  )

  packageGroupFetchCache.set(groupId, request)
  return request
}

// Loader for the GlyphWiki-derived composition data produced by
// scripts/build-glyphwiki-data.mjs. Boxes live on GlyphWiki's 200x200
// design canvas (y grows downward, baseline-agnostic).

const COMPOSITION_DATA_PATH = '/glyphwiki/composition.txt'

export interface GlyphwikiPartBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface GlyphwikiPartPlacement {
  char: string
  box: GlyphwikiPartBox
  variant: string | null
}

export const parseCompositionLine = (
  line: string
): { target: string; parts: GlyphwikiPartPlacement[] } | null => {
  const columns = line.split('\t')
  const target = columns[0]
  if (!target || columns.length < 3) {
    return null
  }

  const parts: GlyphwikiPartPlacement[] = []
  for (const column of columns.slice(1)) {
    const segments = column.split(':')
    const char = segments[0]
    const coordinates = (segments[1] ?? '').split(',').map(Number)
    if (!char || coordinates.length !== 4 || coordinates.some(Number.isNaN)) {
      return null
    }
    parts.push({
      char,
      box: {
        x1: coordinates[0]!,
        y1: coordinates[1]!,
        x2: coordinates[2]!,
        y2: coordinates[3]!,
      },
      variant: segments[2] ?? null,
    })
  }

  return parts.length >= 2 ? { target, parts } : null
}

let compositionMapPromise: Promise<
  Map<string, GlyphwikiPartPlacement[]>
> | null = null

const loadCompositionMap = async () => {
  const response = await fetch(COMPOSITION_DATA_PATH)
  if (!response.ok) {
    throw new Error(`無法載入 GlyphWiki 組字資料：${response.status}`)
  }

  const text = await response.text()
  const map = new Map<string, GlyphwikiPartPlacement[]>()
  for (const line of text.split('\n')) {
    const parsed = parseCompositionLine(line)
    if (parsed) {
      map.set(parsed.target, parsed.parts)
    }
  }
  return map
}

const getCompositionMap = () => {
  if (!compositionMapPromise) {
    compositionMapPromise = loadCompositionMap().catch((error) => {
      // Allow a retry on the next call instead of caching the failure.
      compositionMapPromise = null
      throw error
    })
  }
  return compositionMapPromise
}

export const getGlyphwikiComposition = async (character: string) => {
  const map = await getCompositionMap()
  return map.get(character) ?? null
}

const unionBoxes = (boxes: GlyphwikiPartBox[]): GlyphwikiPartBox => ({
  x1: Math.min(...boxes.map((box) => box.x1)),
  y1: Math.min(...boxes.map((box) => box.y1)),
  x2: Math.max(...boxes.map((box) => box.x2)),
  y2: Math.max(...boxes.map((box) => box.y2)),
})

// Map a sub-part box from its parent's drawn area (the union of the
// parent's own part boxes) into the region the parent occupies upstream.
export const composeNestedPartBox = (
  outer: GlyphwikiPartBox,
  parentUnion: GlyphwikiPartBox,
  inner: GlyphwikiPartBox
): GlyphwikiPartBox => {
  const scaleX =
    (outer.x2 - outer.x1) / Math.max(1, parentUnion.x2 - parentUnion.x1)
  const scaleY =
    (outer.y2 - outer.y1) / Math.max(1, parentUnion.y2 - parentUnion.y1)
  return {
    x1: Math.round(outer.x1 + (inner.x1 - parentUnion.x1) * scaleX),
    y1: Math.round(outer.y1 + (inner.y1 - parentUnion.y1) * scaleY),
    x2: Math.round(outer.x1 + (inner.x2 - parentUnion.x1) * scaleX),
    y2: Math.round(outer.y1 + (inner.y2 - parentUnion.y1) * scaleY),
  }
}

// Direct parts plus nested parts with their boxes composed into the target
// character's canvas (煙 → 火, 垔, and 垔's 西/土 at their effective spots).
// Direct parts precede their own sub-parts, so lookups by char prefer the
// shallowest occurrence.
export const buildDeepPlacements = (
  compositionMap: Map<string, GlyphwikiPartPlacement[]>,
  character: string,
  maxDepth = 2
): GlyphwikiPartPlacement[] | null => {
  const result: GlyphwikiPartPlacement[] = []

  const walk = (
    char: string,
    mapBox: (box: GlyphwikiPartBox) => GlyphwikiPartBox,
    depth: number,
    visited: Set<string>
  ) => {
    const parts = compositionMap.get(char)
    if (!parts) {
      return
    }
    for (const part of parts) {
      const mappedBox = mapBox(part.box)
      result.push({ char: part.char, box: mappedBox, variant: part.variant })

      if (depth >= maxDepth || visited.has(part.char)) {
        continue
      }
      const subParts = compositionMap.get(part.char)
      if (!subParts?.length) {
        continue
      }
      const parentUnion = unionBoxes(subParts.map((subPart) => subPart.box))
      walk(
        part.char,
        (box) => mapBox(composeNestedPartBox(part.box, parentUnion, box)),
        depth + 1,
        new Set([...visited, part.char])
      )
    }
  }

  walk(character, (box) => box, 1, new Set([character]))
  return result.length > 0 ? result : null
}

export const getGlyphwikiCompositionDeep = async (
  character: string,
  maxDepth = 2
) => {
  const map = await getCompositionMap()
  return buildDeepPlacements(map, character, maxDepth)
}

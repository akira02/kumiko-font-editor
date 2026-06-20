let _pendingGlyphId: string | null = null

export function setPendingOverviewTransitionGlyphId(glyphId: string): void {
  _pendingGlyphId = glyphId
}

export function consumePendingOverviewTransitionGlyphId(): string | null {
  const id = _pendingGlyphId
  _pendingGlyphId = null
  return id
}

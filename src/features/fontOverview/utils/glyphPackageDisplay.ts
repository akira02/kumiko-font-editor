export const glyphNameToDisplayCharacter = (glyphName: string) => {
  const unicodeMatch =
    glyphName.match(/^uni([0-9a-f]{4})$/i) ??
    glyphName.match(/^u([0-9a-f]{5,6})$/i)

  if (!unicodeMatch) {
    return glyphName
  }

  const codePoint = Number.parseInt(unicodeMatch[1], 16)
  if (!Number.isFinite(codePoint) || codePoint > 0x10ffff) {
    return glyphName
  }

  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return glyphName
  }
}

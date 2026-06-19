export const MAX_UNICODE_CODE_POINT = 0x10ffff

const SURROGATE_MIN = 0xd800
const SURROGATE_MAX = 0xdfff

export const isValidUnicodeCodePoint = (codePoint: number) =>
  Number.isInteger(codePoint) &&
  codePoint >= 0 &&
  codePoint <= MAX_UNICODE_CODE_POINT &&
  (codePoint < SURROGATE_MIN || codePoint > SURROGATE_MAX)

export const normalizeUnicodeHex = (
  value: string | number | null | undefined
) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const raw =
    typeof value === 'number'
      ? value.toString(16)
      : value.trim().replace(/^(?:U\+|0x)/i, '')
  if (!raw) {
    return null
  }
  if (!/^[0-9a-f]+$/i.test(raw)) {
    return null
  }
  const parsed = Number.parseInt(raw, 16)
  if (!isValidUnicodeCodePoint(parsed)) {
    return null
  }
  return parsed.toString(16).toUpperCase().padStart(4, '0')
}

export const unicodeHexToCodePoint = (
  value: string | number | null | undefined
) => {
  const normalized = normalizeUnicodeHex(value)
  if (!normalized) {
    return null
  }
  const codePoint = Number.parseInt(normalized, 16)
  return isValidUnicodeCodePoint(codePoint) ? codePoint : null
}

export const unicodeHexToCharacter = (
  value: string | number | null | undefined
) => {
  const codePoint = unicodeHexToCodePoint(value)
  return codePoint === null ? null : String.fromCodePoint(codePoint)
}

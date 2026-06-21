import { describe, expect, it } from 'vitest'
import {
  canUseCanonicalUfoZipExport,
  shouldLoadFullDraftForExport,
} from 'src/features/common/fontExport/exportDraftPolicy'

describe('font export draft policy', () => {
  it('uses canonical records for UFO and designspace zip exports', () => {
    expect(canUseCanonicalUfoZipExport('ufo')).toBe(true)
    expect(canUseCanonicalUfoZipExport('designspace')).toBe(true)
    expect(canUseCanonicalUfoZipExport('glyphs')).toBe(false)
    expect(shouldLoadFullDraftForExport(['zip'], 'ufo')).toBe(false)
    expect(shouldLoadFullDraftForExport(['zip'], 'designspace')).toBe(false)
  })

  it('loads a full draft only for exports without canonical streaming', () => {
    expect(shouldLoadFullDraftForExport(['zip'], 'glyphs')).toBe(true)
    expect(shouldLoadFullDraftForExport(['zip'], null)).toBe(true)
    expect(shouldLoadFullDraftForExport(['zip', 'glyphs3'], 'ufo')).toBe(false)
    expect(shouldLoadFullDraftForExport(['glyphs2', 'glyphs3'], null)).toBe(
      false
    )
    expect(shouldLoadFullDraftForExport(['glyphspackage'], 'glyphs')).toBe(
      false
    )
    expect(shouldLoadFullDraftForExport(['otf'], 'ufo')).toBe(true)
  })
})

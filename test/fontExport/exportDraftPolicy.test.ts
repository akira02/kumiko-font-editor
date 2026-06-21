import { describe, expect, it } from 'vitest'
import {
  canUseCanonicalUfoZipExport,
  shouldLoadFullDraftForExport,
} from 'src/features/common/fontExport/exportDraftPolicy'

describe('font export draft policy', () => {
  it('uses source-backed clean marking for UFO and designspace zip exports', () => {
    expect(canUseCanonicalUfoZipExport('ufo')).toBe(true)
    expect(canUseCanonicalUfoZipExport('designspace')).toBe(true)
    expect(canUseCanonicalUfoZipExport('glyphs')).toBe(false)
  })

  it('loads a full draft only for non-streamed binary exports', () => {
    expect(shouldLoadFullDraftForExport(['zip'])).toBe(false)
    expect(shouldLoadFullDraftForExport(['zip'])).toBe(false)
    expect(shouldLoadFullDraftForExport(['zip', 'glyphs3'])).toBe(false)
    expect(shouldLoadFullDraftForExport(['glyphs2', 'glyphs3'])).toBe(false)
    expect(shouldLoadFullDraftForExport(['glyphspackage'])).toBe(false)
    expect(shouldLoadFullDraftForExport(['otf'])).toBe(true)
  })
})

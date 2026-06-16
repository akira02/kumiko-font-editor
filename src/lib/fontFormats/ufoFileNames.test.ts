import { describe, it, expect } from 'vitest'
import { userNameToFileName } from './ufoFileNames'

const fn = (name: string, existing: string[] = []) =>
  userNameToFileName(name, new Set(existing.map((n) => n.toLowerCase())))

describe('userNameToFileName', () => {
  it('matches UFO spec examples', () => {
    expect(fn('a')).toBe('a')
    expect(fn('A')).toBe('A_')
    expect(fn('AE')).toBe('A_E_')
    expect(fn('Ae')).toBe('A_e')
    expect(fn('ae')).toBe('ae')
    expect(fn('aE')).toBe('aE_')
    expect(fn('a.alt')).toBe('a.alt')
    expect(fn('A.alt')).toBe('A_.alt')
    expect(fn('A.Alt')).toBe('A_.A_lt')
    expect(fn('T_H')).toBe('T__H_')
    expect(fn('T_h')).toBe('T__h')
    expect(fn('F_F_I')).toBe('F__F__I_')
    expect(fn('Aacute_V.swash')).toBe('A_acute_V_.swash')
    expect(fn('.notdef')).toBe('_notdef')
    expect(fn('con')).toBe('_con')
    expect(fn('CON')).toBe('C_O_N_')
    expect(fn('con.alt')).toBe('_con.alt')
    expect(fn('alt.con')).toBe('alt._con')
  })

  it('appends a suffix and avoids case-insensitive collisions', () => {
    expect(userNameToFileName('a', new Set(), '.glif')).toBe('a.glif')
    // "A" -> "A_.glif", distinct from "a.glif" on a case-insensitive FS
    expect(userNameToFileName('A', new Set(['a.glif']), '.glif')).toBe(
      'A_.glif'
    )
    // exact collision gets a numbered suffix
    const out = userNameToFileName('a', new Set(['a.glif']), '.glif')
    expect(out).not.toBe('a.glif')
    expect(out.endsWith('.glif')).toBe(true)
  })

  it('replaces illegal characters', () => {
    expect(fn('a/b')).toBe('a_b')
    expect(fn('a*b')).toBe('a_b')
  })
})

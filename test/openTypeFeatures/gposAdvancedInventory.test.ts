import { describe, expect, it } from 'vitest'
import { extractBinaryFeatures } from 'src/lib/openTypeFeatures/extractBinaryFeatures'
import {
  makeBytes,
  makeSfnt,
  writeTag,
  writeUint16,
} from './helpers/binaryTableFixtures'

const makeGposTable = (
  featureTag: string,
  lookupType: number,
  subtable: Uint8Array
) => {
  const tableLength = 56 + subtable.byteLength
  const bytes = makeBytes(tableLength, (view) => {
    writeUint16(view, 0, 1)
    writeUint16(view, 2, 0)
    writeUint16(view, 4, 10)
    writeUint16(view, 6, 30)
    writeUint16(view, 8, 44)

    writeUint16(view, 10, 1)
    writeTag(view, 12, 'latn')
    writeUint16(view, 16, 8)

    writeUint16(view, 18, 4)
    writeUint16(view, 20, 0)

    writeUint16(view, 22, 0)
    writeUint16(view, 24, 0xffff)
    writeUint16(view, 26, 1)
    writeUint16(view, 28, 0)

    writeUint16(view, 30, 1)
    writeTag(view, 32, featureTag)
    writeUint16(view, 36, 8)

    writeUint16(view, 38, 0)
    writeUint16(view, 40, 1)
    writeUint16(view, 42, 0)

    writeUint16(view, 44, 1)
    writeUint16(view, 46, 4)

    writeUint16(view, 48, lookupType)
    writeUint16(view, 50, 0)
    writeUint16(view, 52, 1)
    writeUint16(view, 54, 8)
  })
  bytes.set(subtable, 56)
  return bytes
}

const makeClassPairPositioningSubtable = () =>
  makeBytes(52, (view) => {
    writeUint16(view, 0, 2)
    writeUint16(view, 2, 24)
    writeUint16(view, 4, 0x0004)
    writeUint16(view, 6, 0)
    writeUint16(view, 8, 32)
    writeUint16(view, 10, 42)
    writeUint16(view, 12, 2)
    writeUint16(view, 14, 2)

    writeUint16(view, 16, 0)
    writeUint16(view, 18, 0)
    writeUint16(view, 20, 0)
    writeUint16(view, 22, 0xffb0)

    writeUint16(view, 24, 1)
    writeUint16(view, 26, 2)
    writeUint16(view, 28, 1)
    writeUint16(view, 30, 2)

    writeUint16(view, 32, 1)
    writeUint16(view, 34, 1)
    writeUint16(view, 36, 2)
    writeUint16(view, 38, 1)
    writeUint16(view, 40, 1)

    writeUint16(view, 42, 1)
    writeUint16(view, 44, 3)
    writeUint16(view, 46, 2)
    writeUint16(view, 48, 1)
    writeUint16(view, 50, 1)
  })

const makeMarkToBaseSubtable = () =>
  makeBytes(46, (view) => {
    writeUint16(view, 0, 1)
    writeUint16(view, 2, 12)
    writeUint16(view, 4, 18)
    writeUint16(view, 6, 1)
    writeUint16(view, 8, 24)
    writeUint16(view, 10, 36)

    writeUint16(view, 12, 1)
    writeUint16(view, 14, 1)
    writeUint16(view, 16, 2)

    writeUint16(view, 18, 1)
    writeUint16(view, 20, 1)
    writeUint16(view, 22, 1)

    writeUint16(view, 24, 1)
    writeUint16(view, 26, 0)
    writeUint16(view, 28, 6)
    writeUint16(view, 30, 1)
    writeUint16(view, 32, 120)
    writeUint16(view, 34, 0)

    writeUint16(view, 36, 1)
    writeUint16(view, 38, 4)
    writeUint16(view, 40, 1)
    writeUint16(view, 42, 350)
    writeUint16(view, 44, 700)
  })

describe('advanced GPOS reconstruction', () => {
  it('extracts PairPos class-pair rules with imported glyph classes', () => {
    const state = extractBinaryFeatures(
      makeSfnt([
        {
          tag: 'GPOS',
          data: makeGposTable('kern', 2, makeClassPairPositioningSubtable()),
        },
      ]),
      null,
      ['.notdef', 'A', 'T', 'V', 'W']
    )

    expect(state.unsupportedLookups).toEqual([])
    expect(state.glyphClasses).toMatchObject([
      {
        id: 'class_gpos_0_0_left_1',
        name: '@GPOS_0_0_left_1',
        glyphs: ['A', 'T'],
        origin: 'imported',
      },
      {
        id: 'class_gpos_0_0_right_1',
        name: '@GPOS_0_0_right_1',
        glyphs: ['V', 'W'],
        origin: 'imported',
      },
    ])
    expect(state.lookups).toMatchObject([
      {
        id: 'lookup_gpos_0',
        lookupType: 'pairPos',
        editable: true,
        rules: [
          {
            kind: 'pairPositioning',
            left: { kind: 'class', classId: 'class_gpos_0_0_left_1' },
            right: { kind: 'class', classId: 'class_gpos_0_0_right_1' },
            firstValue: { xAdvance: -80 },
          },
        ],
      },
    ])
  })

  it('extracts MarkToBase rules with imported mark classes', () => {
    const state = extractBinaryFeatures(
      makeSfnt([
        {
          tag: 'GPOS',
          data: makeGposTable('mark', 4, makeMarkToBaseSubtable()),
        },
      ]),
      null,
      ['.notdef', 'A', 'acutecomb']
    )

    expect(state.unsupportedLookups).toEqual([])
    expect(state.markClasses).toMatchObject([
      {
        id: 'mark_class_gpos_0_0_0',
        name: '@MC_GPOS_0_0_0',
        marks: [{ glyph: 'acutecomb', anchor: { x: 120, y: 0 } }],
      },
    ])
    expect(state.lookups).toMatchObject([
      {
        id: 'lookup_gpos_0',
        lookupType: 'markToBasePos',
        editable: true,
        rules: [
          {
            kind: 'markToBase',
            baseGlyphs: { kind: 'glyph', glyph: 'A' },
            anchors: {
              mark_class_gpos_0_0_0: { x: 350, y: 700 },
            },
          },
        ],
      },
    ])
  })
})

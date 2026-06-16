import { describe, it, expect } from 'vitest'
import {
  createBackupLayer,
  deleteBackupLayer,
  duplicateLayer,
  listGlyphLayers,
  promoteBackupToMaster,
  renameBackupLayer,
} from './glyphLayerOps'
import type { GlyphData } from './types'

const makeGlyph = (): GlyphData => ({
  id: 'g1',
  name: 'a',
  activeLayerId: 'public.default',
  paths: [
    {
      id: 'p1',
      closed: true,
      nodes: [{ id: 'n1', x: 1, y: 2, type: 'corner' }],
    },
  ],
  components: [],
  componentRefs: [],
  metrics: { lsb: 0, rsb: 0, width: 500 },
})

describe('glyphLayerOps', () => {
  it('lists the active master synthesised from hot content', () => {
    const layers = listGlyphLayers(makeGlyph())
    expect(layers).toHaveLength(1)
    expect(layers[0].id).toBe('public.default')
    expect(layers[0].type).toBe('master')
    expect(layers[0].paths[0].nodes[0].x).toBe(1)
  })

  it('creates a backup whose id is its name, snapshotting hot content', () => {
    const glyph = createBackupLayer(makeGlyph(), 'Backup 1')
    const layers = listGlyphLayers(glyph)
    expect(layers.map((l) => l.id)).toEqual(['public.default', 'Backup 1'])
    expect(layers[1].type).toBe('backup')
    expect(layers[1].name).toBe('Backup 1')
    expect(layers[1].paths[0].nodes[0].x).toBe(1)
    // mutating the master afterwards must not mutate the backup snapshot
    glyph.paths = [
      {
        id: 'p1',
        closed: true,
        nodes: [{ id: 'n1', x: 99, y: 2, type: 'corner' }],
      },
    ]
    expect(glyph.layers!['Backup 1'].paths[0].nodes[0].x).toBe(1)
  })

  it('disambiguates same-name backups with " (2)"', () => {
    let glyph = createBackupLayer(makeGlyph(), '16 Jun, 25 17:08')
    glyph = createBackupLayer(glyph, '16 Jun, 25 17:08')
    expect(listGlyphLayers(glyph).map((l) => l.id)).toEqual([
      'public.default',
      '16 Jun, 25 17:08',
      '16 Jun, 25 17:08 (2)',
    ])
  })

  it('renames by re-keying so id stays equal to name', () => {
    let glyph = createBackupLayer(makeGlyph(), 'Backup 1')
    glyph = renameBackupLayer(glyph, 'Backup 1', 'Renamed')
    expect(glyph.layers!['Backup 1']).toBeUndefined()
    expect(glyph.layers!.Renamed.name).toBe('Renamed')
    expect(listGlyphLayers(glyph).map((l) => l.id)).toEqual([
      'public.default',
      'Renamed',
    ])
  })

  it('deletes backups but never the master', () => {
    let glyph = createBackupLayer(makeGlyph(), 'Backup 1')
    glyph = deleteBackupLayer(glyph, 'public.default')
    expect(glyph.layers!['Backup 1']).toBeDefined()
    glyph = deleteBackupLayer(glyph, 'Backup 1')
    expect(listGlyphLayers(glyph)).toHaveLength(1)
  })

  it('duplicates a layer into a new backup', () => {
    let glyph = createBackupLayer(makeGlyph(), 'Backup 1')
    glyph = duplicateLayer(glyph, 'Backup 1', 'Backup 1 copy')
    expect(listGlyphLayers(glyph).map((l) => l.id)).toEqual([
      'public.default',
      'Backup 1',
      'Backup 1 copy',
    ])
  })

  it('promoteBackupToMaster swaps backup into hot, keeping old hot as a backup', () => {
    let glyph = createBackupLayer(makeGlyph(), 'Backup 1')
    glyph.layers!['Backup 1'].paths = [
      {
        id: 'p9',
        closed: true,
        nodes: [{ id: 'n9', x: 50, y: 60, type: 'corner' }],
      },
    ]
    const result = promoteBackupToMaster(glyph, 'Backup 1', 'Previous')
    expect(result.paths[0].nodes[0].x).toBe(50)
    expect(result.layers!['Backup 1']).toBeUndefined()
    expect(result.layers!.Previous.paths[0].nodes[0].x).toBe(1)
    expect(listGlyphLayers(result).map((l) => l.id)).toEqual([
      'public.default',
      'Previous',
    ])
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { useStore } from 'src/store'
import type { FontData, GlyphData } from 'src/store/types'

const twoMasterGlyph = (): GlyphData => ({
  id: 'A',
  name: 'A',
  activeLayerId: 'Light',
  layerOrder: ['Light', 'Bold'],
  layers: {
    Light: {
      id: 'Light',
      name: 'Light',
      type: 'master',
      associatedMasterId: 'Light',
      paths: [
        {
          id: 'p',
          closed: true,
          nodes: [{ id: 'n', x: 10, y: 0, type: 'corner' }],
        },
      ],
      components: [],
      componentRefs: [],
      anchors: [],
      guidelines: [],
      metrics: { lsb: 0, rsb: 0, width: 500 },
    },
    Bold: {
      id: 'Bold',
      name: 'Bold',
      type: 'master',
      associatedMasterId: 'Bold',
      paths: [
        {
          id: 'p',
          closed: true,
          nodes: [{ id: 'n', x: 80, y: 0, type: 'corner' }],
        },
      ],
      components: [],
      componentRefs: [],
      anchors: [],
      guidelines: [],
      metrics: { lsb: 0, rsb: 0, width: 700 },
    },
  },
})

const fontData = (): FontData => ({
  glyphs: { A: twoMasterGlyph() },
  glyphOrder: ['A'],
  sources: {
    Light: { id: 'Light', name: 'Light', location: { Weight: 0 } },
    Bold: { id: 'Bold', name: 'Bold', location: { Weight: 100 } },
  },
})

describe('setActiveMasterId convergence', () => {
  afterEach(() => {
    useStore.getState().closeProjectState()
  })

  it('initialises activeMasterId to the default source on load', () => {
    useStore.getState().loadProjectState('p', 'P', fontData())
    expect(useStore.getState().activeMasterId).toBe('Light')
  })

  it('switching master converges selectedLayerId, editLocation, and glyph active layer', () => {
    useStore.getState().loadProjectState('p', 'P', fontData())
    useStore.getState().setActiveMasterId('Bold')

    const state = useStore.getState()
    expect(state.activeMasterId).toBe('Bold')
    expect(state.selectedLayerId).toBe('Bold')
    expect(state.editLocation).toEqual({ Weight: 100 })
    expect(state.fontData?.glyphs.A.activeLayerId).toBe('Bold')
  })

  it('edits after switching target the new master layer', () => {
    useStore.getState().loadProjectState('p', 'P', fontData())
    useStore.getState().setActiveMasterId('Bold')
    useStore.getState().updateNodePosition('A', 'p', 'n', { x: 123, y: 0 })

    const layers = useStore.getState().fontData?.glyphs.A.layers
    expect(layers?.Bold.paths[0].nodes[0].x).toBe(123)
    // the other master is untouched
    expect(layers?.Light.paths[0].nodes[0].x).toBe(10)
  })
})

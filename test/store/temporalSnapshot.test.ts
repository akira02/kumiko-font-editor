import { afterEach, describe, expect, it } from 'vitest'
import { useStore } from 'src/store'
import type { FontData, GlyphData, GlyphLayerData } from 'src/store'

const makeLayer = (id: string, width = 1000): GlyphLayerData => ({
  id,
  name: id,
  type: 'master',
  associatedMasterId: id,
  paths: [
    {
      id: `${id}-path`,
      closed: false,
      nodes: [],
    },
  ],
  componentRefs: [],
  anchors: [],
  guidelines: [],
  metrics: { width, lsb: 0, rsb: 0 },
})

const makeGlyph = (id: string): GlyphData => ({
  id,
  name: id,
  activeLayerId: 'public.default',
  layerOrder: ['public.default'],
  unicodes: [],
  layers: {
    'public.default': makeLayer('public.default'),
  },
})

describe('temporal snapshots', () => {
  afterEach(() => {
    useStore.getState().closeProjectState()
  })

  it('drops non-working-set glyph geometry from undo history', () => {
    const fontData: FontData = {
      glyphOrder: ['A', 'B'],
      glyphs: {
        A: makeGlyph('A'),
        B: makeGlyph('B'),
      },
    }
    useStore.getState().loadProjectState('project-a', 'Project A', fontData)
    useStore.getState().setSelectedGlyphId('A')
    useStore.getState().updateGlyphMetrics('A', { width: 900 })

    const snapshot = useStore.temporal.getState().pastStates[0] as {
      fontData?: FontData | null
    }

    expect(snapshot.fontData?.glyphs.A.layers).toBeDefined()
    expect(snapshot.fontData?.glyphs.B.layers).toBeUndefined()
    expect(snapshot.fontData?.glyphs.B.activeLayerId).toBeNull()
  })

  it('keeps dirty glyph geometry even when the glyph is not selected', () => {
    const fontData: FontData = {
      glyphOrder: ['A', 'B'],
      glyphs: {
        A: makeGlyph('A'),
        B: makeGlyph('B'),
      },
    }
    useStore.getState().loadProjectState('project-a', 'Project A', fontData)
    useStore.getState().setSelectedGlyphId('A')
    useStore.getState().updateGlyphMetrics('B', { width: 900 })
    useStore.getState().updateGlyphMetrics('A', { width: 800 })

    const latestSnapshot = useStore.temporal.getState().pastStates.at(-1) as {
      fontData?: FontData | null
    }

    expect(latestSnapshot.fontData?.glyphs.B.layers).toBeDefined()
  })
})

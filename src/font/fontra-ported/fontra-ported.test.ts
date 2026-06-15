import { describe, it, expect } from 'vitest'
import { VariationModel, normalizeLocation } from './var-model'
import { DiscreteVariationModel } from './discrete-variation-model'
import { fitCubic } from './fit-cubic'

describe('VariationModel', () => {
  it('linearly interpolates a 2-master 1D model', () => {
    const model = new VariationModel([{}, { wght: 1 }], ['wght'])
    const deltas = model.getDeltas([0, 100]) // master values
    expect(model.interpolateFromDeltas({ wght: 0 }, deltas)).toBeCloseTo(0)
    expect(model.interpolateFromDeltas({ wght: 0.5 }, deltas)).toBeCloseTo(50)
    expect(model.interpolateFromDeltas({ wght: 1 }, deltas)).toBeCloseTo(100)
  })

  it('interpolates objects item-wise (a point with x/y)', () => {
    const model = new VariationModel([{}, { wght: 1 }])
    const deltas = model.getDeltas([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ])
    const p = model.interpolateFromDeltas({ wght: 0.5 }, deltas)
    expect(p.x).toBeCloseTo(5)
    expect(p.y).toBeCloseTo(10)
  })

  it('normalizeLocation maps to -1..1 around default', () => {
    const axes = [
      { name: 'wght', minValue: 100, defaultValue: 400, maxValue: 900 },
    ]
    expect(normalizeLocation({ wght: 400 }, axes).wght).toBeCloseTo(0)
    expect(normalizeLocation({ wght: 900 }, axes).wght).toBeCloseTo(1)
    expect(normalizeLocation({ wght: 100 }, axes).wght).toBeCloseTo(-1)
  })
})

describe('DiscreteVariationModel', () => {
  it('handles a discrete axis split', () => {
    const axes = [
      { name: 'ital', values: [0, 1], defaultValue: 0 },
      { name: 'wght', minValue: 0, defaultValue: 0, maxValue: 1 },
    ]
    const locations = [{}, { wght: 1 }, { ital: 1 }, { ital: 1, wght: 1 }]
    const model = new DiscreteVariationModel(locations, axes)
    const deltas = model.getDeltas([0, 100, 1000, 1100])
    const r = model.interpolateFromDeltas({ ital: 1, wght: 0.5 }, deltas)
    expect(r.instance).toBeCloseTo(1050)
  })
})

describe('fitCubic', () => {
  it('fits points sampled along a straight line', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 25, y: 25 },
      { x: 50, y: 50 },
      { x: 75, y: 75 },
      { x: 100, y: 100 },
    ]
    const tangent = { x: Math.SQRT1_2, y: Math.SQRT1_2 }
    const bezier = fitCubic(pts, tangent, { x: -tangent.x, y: -tangent.y }, 1)
    const mid = bezier.get(0.5)
    expect(mid.x).toBeCloseTo(50, 0)
    expect(mid.y).toBeCloseTo(50, 0)
  })
})

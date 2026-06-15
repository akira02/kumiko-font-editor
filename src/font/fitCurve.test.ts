import { describe, it, expect } from 'vitest'
import { Bezier } from 'bezier-js'
import { fitCurve } from './fitCurve'

describe('fitCurve', () => {
  it('fits a straight run into a single segment near the line', () => {
    const points = Array.from({ length: 11 }, (_, i) => ({
      x: i * 10,
      y: i * 10,
    }))
    const segments = fitCurve(points, 1)
    expect(segments.length).toBe(1)
    const mid = segments[0].get(0.5)
    expect(mid.x).toBeCloseTo(50, 0)
    expect(mid.y).toBeCloseTo(50, 0)
  })

  it('recovers a known cubic from sampled points', () => {
    const source = new Bezier(
      { x: 0, y: 0 },
      { x: 100, y: 300 },
      { x: 300, y: 300 },
      { x: 400, y: 0 }
    )
    const points = Array.from({ length: 41 }, (_, i) => source.get(i / 40))
    // 10-unit tolerance (squared), matching the brush tool.
    const segments = fitCurve(points, 100)
    expect(segments.length).toBeGreaterThanOrEqual(1)
    expect(segments.length).toBeLessThanOrEqual(4)
    // Every sample must lie within tolerance of the fitted chain
    // (parameterisation-free check).
    for (const p of points) {
      const nearest = Math.min(
        ...segments.map((segment) => {
          const projected = segment.project(p)
          return Math.hypot(projected.x - p.x, projected.y - p.y)
        })
      )
      expect(nearest).toBeLessThan(12)
    }
  })

  it('returns no segments for degenerate input', () => {
    expect(fitCurve([{ x: 5, y: 5 }], 1)).toEqual([])
    expect(
      fitCurve(
        [
          { x: 5, y: 5 },
          { x: 5, y: 5 },
        ],
        1
      )
    ).toEqual([])
  })
})

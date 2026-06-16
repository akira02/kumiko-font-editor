import { describe, it, expect } from 'vitest'
import { computeRuler, type RulerSegment } from './powerRuler'

// A 100-wide, 200-tall rectangle stem from x=100..200.
const stem: RulerSegment[] = [
  {
    type: 'line',
    points: [
      { x: 100, y: 0 },
      { x: 200, y: 0 },
    ],
  },
  {
    type: 'line',
    points: [
      { x: 200, y: 0 },
      { x: 200, y: 200 },
    ],
  },
  {
    type: 'line',
    points: [
      { x: 200, y: 200 },
      { x: 100, y: 200 },
    ],
  },
  {
    type: 'line',
    points: [
      { x: 100, y: 200 },
      { x: 100, y: 0 },
    ],
  },
]

describe('computeRuler', () => {
  it('measures stem width across a horizontal ray', () => {
    const { measurePoints } = computeRuler(
      stem,
      { x: 150, y: 100 },
      { x: 1, y: 0 }
    )
    const inside = measurePoints.filter((mp) => mp.inside)
    expect(inside).toHaveLength(1)
    expect(inside[0].distance).toBe(100)
  })

  it('measures sidebearings via guide lines at x=0 and x=advance', () => {
    const { measurePoints } = computeRuler(
      stem,
      { x: 150, y: 100 },
      { x: 1, y: 0 },
      [
        { axis: 'x', value: 0 },
        { axis: 'x', value: 300 },
      ]
    )
    const outside = measurePoints
      .filter((mp) => !mp.inside)
      .map((mp) => mp.distance)
      .sort((a, b) => a - b)
    // Left bearing 0..100 and right bearing 200..300.
    expect(outside).toEqual([100, 100])
  })

  it('returns no inside span when the ray misses the outline', () => {
    const { measurePoints } = computeRuler(
      stem,
      { x: 150, y: 500 },
      { x: 1, y: 0 }
    )
    expect(measurePoints.every((mp) => !mp.inside)).toBe(true)
  })
})

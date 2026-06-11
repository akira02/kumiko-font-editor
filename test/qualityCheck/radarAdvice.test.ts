import { describe, expect, it } from 'vitest'
import { buildRadarAdvice } from 'src/features/common/qualityCheck/radarAdvice'
import type {
  RadarReason,
  RadarRobustStat,
} from 'src/features/common/qualityCheck/qualityRadar'

const makeReason = (overrides: Partial<RadarReason>): RadarReason => ({
  key: 'bearing:top:branching',
  label: '頂部樹枝筆畫邊距',
  dimension: 'boundary',
  format: 'units',
  value: 153,
  median: 80,
  zScore: 2.8,
  ...overrides,
})

const stat: RadarRobustStat = {
  count: 30,
  median: 80,
  scale: 20,
  p10: 60,
  p90: 100,
}

describe('buildRadarAdvice', () => {
  it('describes excessive top bearing with direction and delta', () => {
    const advice = buildRadarAdvice(makeReason({}), stat)
    expect(advice.title).toContain('頂部')
    expect(advice.title).toContain('多')
    expect(advice.action).toContain('往上延伸')
    expect(advice.action).toContain('73')
    expect(advice.detail).toContain('60–100')
  })

  it('flips direction for negative z-score', () => {
    const advice = buildRadarAdvice(
      makeReason({ value: 20, zScore: -2.6 }),
      stat
    )
    expect(advice.title).toContain('少')
    expect(advice.action).toContain('往下收')
  })

  it('maps severity from z-score magnitude', () => {
    expect(buildRadarAdvice(makeReason({ zScore: 2.1 })).severity).toBe(
      'notice'
    )
    expect(buildRadarAdvice(makeReason({ zScore: -3.2 })).severity).toBe(
      'warning'
    )
  })

  it('compares detrended size features against the complexity expectation', () => {
    const advice = buildRadarAdvice(
      makeReason({
        key: 'face:widthRatio',
        format: 'percent',
        value: 0.92,
        median: 0.84,
        expected: 0.8,
        zScore: 2.4,
      })
    )
    expect(advice.title).toContain('偏寬')
    expect(advice.detail).toContain('同複雜度')
    expect(advice.detail).toContain('80.0%')
  })

  it('describes centroid imbalance with a corrective direction', () => {
    const advice = buildRadarAdvice(
      makeReason({
        key: 'balance:centroidX',
        format: 'percent',
        value: 0.04,
        median: 0,
        zScore: 2.7,
      })
    )
    expect(advice.title).toContain('偏右')
    expect(advice.action).toContain('往左')
  })
})

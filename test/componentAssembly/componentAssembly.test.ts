import { describe, expect, it } from 'vitest'
import {
  computeCenterPlacement,
  extractPartPaths,
  getFontVerticalBox,
  getPathsBounds,
  groupPathsByPartBoxes,
  mapGlyphwikiBoxToFontUnits,
  scorePartFit,
  transformPaths,
} from 'src/lib/componentAssembly'
import type { PathData } from 'src/store'

const makeRectPath = (
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
): PathData => ({
  id: 'p',
  closed: true,
  nodes: [
    { id: 'n1', x: xMin, y: yMin, type: 'corner' },
    { id: 'n2', x: xMax, y: yMin, type: 'corner' },
    { id: 'n3', x: xMax, y: yMax, type: 'corner' },
    { id: 'n4', x: xMin, y: yMax, type: 'corner' },
  ],
})

describe('mapGlyphwikiBoxToFontUnits', () => {
  it('maps the 200x200 canvas onto the em box with y flipped', () => {
    const rect = mapGlyphwikiBoxToFontUnits(
      { x1: 0, y1: 0, x2: 200, y2: 200 },
      1000,
      { top: 880, bottom: -120 }
    )
    expect(rect).toEqual({ xMin: 0, xMax: 1000, yMax: 880, yMin: -120 })
  })

  it('places a left-half box on the left with correct heights', () => {
    const rect = mapGlyphwikiBoxToFontUnits(
      { x1: 14, y1: 18, x2: 87, y2: 185 },
      1000,
      { top: 880, bottom: -120 }
    )
    expect(rect.xMin).toBeCloseTo(70)
    expect(rect.xMax).toBeCloseTo(435)
    expect(rect.yMax).toBeCloseTo(880 - 90)
    expect(rect.yMin).toBeCloseTo(880 - 925)
  })
})

describe('computeCenterPlacement / transformPaths', () => {
  it('centers paths on the target rect without scaling', () => {
    const paths = [makeRectPath(100, 100, 300, 500)]
    const target = { xMin: 50, yMin: 0, xMax: 150, yMax: 200 }
    const transform = computeCenterPlacement(getPathsBounds(paths)!, target)
    expect(transform.scaleX).toBe(1)
    expect(transform.scaleY).toBe(1)
    const moved = transformPaths(paths, transform)
    const bounds = getPathsBounds(moved)!
    // Size preserved, centers aligned.
    expect(bounds.xMax - bounds.xMin).toBe(200)
    expect(bounds.yMax - bounds.yMin).toBe(400)
    expect((bounds.xMin + bounds.xMax) / 2).toBe(100)
    expect((bounds.yMin + bounds.yMax) / 2).toBe(100)
  })

  it('regenerates path and node ids', () => {
    const paths = [makeRectPath(0, 0, 10, 10)]
    const moved = transformPaths(paths, {
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
    })
    expect(moved[0]!.id).not.toBe(paths[0]!.id)
    expect(moved[0]!.nodes[0]!.id).not.toBe(paths[0]!.nodes[0]!.id)
  })
})

describe('extractPartPaths', () => {
  it('keeps paths inside the part box and drops the rest', () => {
    const leftPart = makeRectPath(50, 0, 400, 800)
    const rightPart = makeRectPath(600, 0, 950, 800)
    const selected = extractPartPaths([leftPart, rightPart], {
      xMin: 0,
      yMin: -120,
      xMax: 450,
      yMax: 880,
    })
    expect(selected).toEqual([leftPart])
  })

  it('keeps zero-area strokes whose center is inside the box', () => {
    const verticalStroke: PathData = {
      id: 'stroke',
      closed: false,
      nodes: [
        { id: 'a', x: 200, y: 0, type: 'corner' },
        { id: 'b', x: 200, y: 700, type: 'corner' },
      ],
    }
    const selected = extractPartPaths([verticalStroke], {
      xMin: 0,
      yMin: -120,
      xMax: 450,
      yMax: 880,
    })
    expect(selected).toHaveLength(1)
  })
})

describe('groupPathsByPartBoxes', () => {
  it('groups every stroke of a radical into one part', () => {
    // 火-like donor: body plus two dots, all within the left part box.
    const body = makeRectPath(100, 0, 350, 700)
    const dotLeft = makeRectPath(80, 500, 150, 600)
    const dotRight = makeRectPath(300, 500, 380, 600)
    const rightPart = makeRectPath(500, 0, 900, 700)
    const leftBox = { xMin: 0, yMin: -120, xMax: 450, yMax: 880 }
    const rightBox = { xMin: 450, yMin: -120, xMax: 1000, yMax: 880 }

    const { groups, remaining } = groupPathsByPartBoxes(
      [body, dotLeft, dotRight, rightPart],
      [leftBox, rightBox]
    )
    expect(groups[0]).toEqual([body, dotLeft, dotRight])
    expect(groups[1]).toEqual([rightPart])
    expect(remaining).toEqual([])
  })

  it('leaves unclaimed paths for fallback grouping', () => {
    const stray = makeRectPath(400, 0, 600, 800)
    const { groups, remaining } = groupPathsByPartBoxes(
      [stray],
      [{ xMin: 0, yMin: 0, xMax: 420, yMax: 800 }]
    )
    expect(groups[0]).toEqual([])
    expect(remaining).toEqual([stray])
  })
})

describe('scorePartFit', () => {
  it('prefers donors with closer part proportions', () => {
    const target = { x1: 14, y1: 18, x2: 87, y2: 185 }
    const closeDonor = { x1: 12, y1: 18, x2: 78, y2: 185 }
    const farDonor = { x1: 10, y1: 10, x2: 190, y2: 100 }
    expect(scorePartFit(closeDonor, target)).toBeLessThan(
      scorePartFit(farDonor, target)
    )
  })
})

describe('getFontVerticalBox', () => {
  it('uses line metrics when available', () => {
    expect(
      getFontVerticalBox({
        unitsPerEm: 1000,
        lineMetricsHorizontalLayout: { ascender: { value: 880 } },
      })
    ).toEqual({ top: 880, bottom: -120 })
  })

  it('falls back to 0.88em', () => {
    expect(getFontVerticalBox({ unitsPerEm: 1000 })).toEqual({
      top: 880,
      bottom: -120,
    })
  })
})

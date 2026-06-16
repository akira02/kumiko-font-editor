// Power-ruler measurement maths, framework-agnostic so the tool (drag/snap)
// and the visualization layer (per-frame redraw) can share it.

import { Bezier } from 'bezier-js'

export interface Vec {
  x: number
  y: number
}

export interface RulerSegment {
  points: Vec[]
  type?: 'line' | 'quad' | 'cubic' | 'quadBlob'
}

// Axis-aligned bounding line (sidebearing); bounds spans but does not flip
// the inside/outside winding.
export interface RulerGuideLine {
  axis: 'x' | 'y'
  value: number
}

export interface RulerIntersection {
  x: number
  y: number
  // Signed distance from basePoint along the direction vector; used to order
  // intersections along the ruler.
  s: number
  winding: number
}

export interface RulerMeasurePoint {
  x: number
  y: number
  distance: number
  inside: boolean
}

export interface RulerResult {
  intersections: RulerIntersection[]
  measurePoints: RulerMeasurePoint[]
}

// Minimal shape of the sceneView glyph path needed to enumerate segments.
interface RulerGlyphPath {
  numContours: number
  iterContourSegments?(contourIndex: number): Generator<RulerSegment, void>
}

// Far enough to span any glyph for line↔Bézier root finding.
const RAY_HALF_LENGTH = 1e5

export function* glyphRulerSegments(
  path: RulerGlyphPath
): Generator<RulerSegment> {
  if (!path.iterContourSegments) {
    return
  }
  for (let contour = 0; contour < path.numContours; contour += 1) {
    for (const segment of path.iterContourSegments(contour)) {
      yield { points: segment.points, type: segment.type }
    }
  }
}

export function computeRuler(
  segments: Iterable<RulerSegment>,
  basePoint: Vec,
  direction: Vec,
  guideLines: RulerGuideLine[] = []
): RulerResult {
  const hits: RulerIntersection[] = []

  const lineP1 = {
    x: basePoint.x - direction.x * RAY_HALF_LENGTH,
    y: basePoint.y - direction.y * RAY_HALF_LENGTH,
  }
  const lineP2 = {
    x: basePoint.x + direction.x * RAY_HALF_LENGTH,
    y: basePoint.y + direction.y * RAY_HALF_LENGTH,
  }

  for (const segment of segments) {
    const pts = segment.points
    if (segment.type === 'quadBlob' || pts.length < 2) {
      continue
    }
    if (segment.type === 'line' || pts.length === 2) {
      addLineHit(hits, basePoint, direction, pts[0], pts[pts.length - 1])
      continue
    }
    const bezier = new Bezier(...pts.map((p) => ({ x: p.x, y: p.y })))
    for (const t of bezier.lineIntersects({ p1: lineP1, p2: lineP2 })) {
      const p = bezier.get(t)
      addHit(hits, basePoint, direction, p, bezier.derivative(t))
    }
  }

  for (const guide of guideLines) {
    addGuideHit(hits, basePoint, direction, guide)
  }

  hits.sort((a, b) => a.s - b.s)

  const measurePoints: RulerMeasurePoint[] = []
  let winding = 0
  for (let i = 0; i < hits.length - 1; i += 1) {
    winding += hits[i].winding
    const a = hits[i]
    const b = hits[i + 1]
    const distance = Math.hypot(b.x - a.x, b.y - a.y)
    if (distance < 0.001) {
      continue
    }
    measurePoints.push({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      distance: Math.round(distance * 10) / 10,
      inside: winding !== 0,
    })
  }

  return { intersections: hits, measurePoints }
}

function cross(a: Vec, b: Vec) {
  return a.x * b.y - a.y * b.x
}

function pushHit(
  hits: RulerIntersection[],
  basePoint: Vec,
  direction: Vec,
  point: Vec,
  winding: number
) {
  const s =
    (point.x - basePoint.x) * direction.x +
    (point.y - basePoint.y) * direction.y
  hits.push({ x: point.x, y: point.y, s, winding })
}

function addHit(
  hits: RulerIntersection[],
  basePoint: Vec,
  direction: Vec,
  point: Vec,
  tangent: Vec
) {
  pushHit(
    hits,
    basePoint,
    direction,
    point,
    Math.sign(cross(direction, tangent))
  )
}

function addLineHit(
  hits: RulerIntersection[],
  basePoint: Vec,
  direction: Vec,
  a: Vec,
  b: Vec
) {
  const segDir = { x: b.x - a.x, y: b.y - a.y }
  // Solve basePoint + s*direction = a + u*segDir.
  const det = cross(segDir, direction)
  if (Math.abs(det) < 1e-9) {
    return
  }
  const rx = a.x - basePoint.x
  const ry = a.y - basePoint.y
  const u = (direction.x * ry - direction.y * rx) / det
  if (u < 0 || u > 1) {
    return
  }
  pushHit(
    hits,
    basePoint,
    direction,
    { x: a.x + segDir.x * u, y: a.y + segDir.y * u },
    Math.sign(cross(direction, segDir))
  )
}

function addGuideHit(
  hits: RulerIntersection[],
  basePoint: Vec,
  direction: Vec,
  guide: RulerGuideLine
) {
  const dirComponent = guide.axis === 'x' ? direction.x : direction.y
  if (Math.abs(dirComponent) < 1e-9) {
    return
  }
  const baseComponent = guide.axis === 'x' ? basePoint.x : basePoint.y
  const s = (guide.value - baseComponent) / dirComponent
  pushHit(
    hits,
    basePoint,
    direction,
    { x: basePoint.x + direction.x * s, y: basePoint.y + direction.y * s },
    0
  )
}

import type { GlyphGeometrySample } from 'src/features/common/qualityCheck/glyphSampling'
import {
  sideLabels,
  strokeTypeLabels,
  type StructureSide,
} from 'src/features/common/qualityCheck/structureMetrics'

/**
 * Font Quality Radar：以同一套字體自身的統計分布為基準的
 * 幾何離群偵測（outlier detection），不是美學評分。
 * 每個特徵以 median/MAD 計算 robust z-score，
 * 偏離群體越遠的字越值得人工檢查。
 */

export type RadarDimension = 'boundary' | 'proportion' | 'ink' | 'balance'

export const radarDimensionLabels: Record<RadarDimension, string> = {
  boundary: '邊界一致性',
  proportion: '字面比例',
  ink: '墨量穩定',
  balance: '視覺重心',
}

export type RadarValueFormat = 'units' | 'ratio' | 'percent'

interface RadarFeatureDefinition {
  key: string
  label: string
  dimension: RadarDimension
  format: RadarValueFormat
}

export interface RadarFeatureValue extends RadarFeatureDefinition {
  value: number
}

export interface RadarRobustStat {
  count: number
  median: number
  /** robust 標準差（1.4826 × MAD，MAD 退化時退回更寬的離散度估計） */
  scale: number
  p10: number
  p90: number
}

export interface RadarReason {
  key: string
  label: string
  dimension: RadarDimension
  format: RadarValueFormat
  value: number
  median: number
  /** 依複雜度迴歸後的期望值（僅尺寸特徵有，取代 median 作為比較對象） */
  expected?: number
  zScore: number
}

export interface RadarGlyphEvaluation {
  glyphId: string
  glyphName: string
  character: string
  /** 超出正常區間的累積程度；0 表示完全落在群體內 */
  score: number
  reasons: RadarReason[]
}

export interface RadarDimensionScore {
  dimension: RadarDimension
  /** 0–100：該維度下「無明顯離群特徵」的字形比例 */
  score: number
  outlierCount: number
}

/**
 * 延伸性（3type 報告）：字面大小應隨筆畫複雜度正相關成長（冒比二高大），
 * 故尺寸特徵不能直接要求一致，需先對複雜度做線性迴歸、再以殘差比較。
 */
export interface RadarSizeTrend {
  medianComplexity: number
  slopeByKey: Map<string, number>
}

export interface RadarAnalysis {
  sampleCount: number
  featureStats: Map<string, RadarRobustStat>
  sizeTrend: RadarSizeTrend
  dimensionScores: RadarDimensionScore[]
  overallScore: number
  /** 依風險分數排序的可疑字形（score > 0） */
  suspects: RadarGlyphEvaluation[]
  evaluationByGlyphId: Map<string, RadarGlyphEvaluation>
}

/** 特徵 |z| 達此值列入異常原因 */
export const RADAR_REASON_Z = 2
/** 特徵 |z| 達此值將該字計入維度離群 */
export const RADAR_OUTLIER_Z = 2.5
const MIN_RADAR_SAMPLES = 20
const MAD_TO_SIGMA = 1.4826
const IQR_TO_SIGMA = 1 / 1.349

const STRUCTURE_SIDES: StructureSide[] = ['left', 'right', 'top', 'bottom']

const collectGlyphFeatures = (
  sample: GlyphGeometrySample,
  unitsPerEm: number,
  bodyCenterY: number
): RadarFeatureValue[] => {
  const features: RadarFeatureValue[] = []
  const advance = Math.max(1, sample.advance)
  const ink = sample.ink

  // 邊界：依邊界筆畫理論，框架/樹枝筆畫分開建立分布
  for (const side of STRUCTURE_SIDES) {
    const sideSample = sample.sides[side]
    features.push({
      key: `bearing:${side}:${sideSample.type}`,
      label: `${sideLabels[side]}${strokeTypeLabels[sideSample.type]}邊距`,
      dimension: 'boundary',
      format: 'units',
      value: sideSample.bearing,
    })
  }

  // 字面比例
  const faceWidth = sample.bounds.xMax - sample.bounds.xMin
  const faceHeight = sample.bounds.yMax - sample.bounds.yMin
  features.push({
    key: 'face:widthRatio',
    label: '字面寬度比',
    dimension: 'proportion',
    format: 'percent',
    value: faceWidth / advance,
  })
  features.push({
    key: 'face:heightRatio',
    label: '字面高度比',
    dimension: 'proportion',
    format: 'percent',
    value: faceHeight / unitsPerEm,
  })
  if (faceHeight > 0) {
    features.push({
      key: 'face:aspect',
      label: '字面長寬比',
      dimension: 'proportion',
      format: 'ratio',
      value: faceWidth / faceHeight,
    })
  }

  // 墨量與密度分布
  if (ink.inkToFaceRatio !== null) {
    features.push({
      key: 'ink:toFace',
      label: '字面內墨量比',
      dimension: 'ink',
      format: 'percent',
      value: ink.inkToFaceRatio,
    })
  }
  if (ink.inkToEmRatio !== null) {
    features.push({
      key: 'ink:toEm',
      label: '版面墨量比',
      dimension: 'ink',
      format: 'percent',
      value: ink.inkToEmRatio,
    })
  }
  if (ink.spreadX !== null && ink.spreadY !== null) {
    features.push({
      key: 'ink:spreadX',
      label: '水平密度分布',
      dimension: 'ink',
      format: 'percent',
      value: ink.spreadX / advance,
    })
    features.push({
      key: 'ink:spreadY',
      label: '垂直密度分布',
      dimension: 'ink',
      format: 'percent',
      value: ink.spreadY / unitsPerEm,
    })
  }

  // 視覺重心
  if (ink.centroidX !== null && ink.centroidY !== null) {
    features.push({
      key: 'balance:centroidX',
      label: '重心水平偏移',
      dimension: 'balance',
      format: 'percent',
      value: (ink.centroidX - advance / 2) / advance,
    })
    features.push({
      key: 'balance:centroidY',
      label: '重心垂直偏移',
      dimension: 'balance',
      format: 'percent',
      value: (ink.centroidY - bodyCenterY) / unitsPerEm,
    })
  }

  return features
}

const quantileOf = (sorted: number[], q: number) => {
  if (sorted.length === 0) {
    return 0
  }
  const position = (sorted.length - 1) * q
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const weight = position - lowerIndex
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight
}

export const buildRobustStat = (values: number[]): RadarRobustStat | null => {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((left, right) => left - right)
  const median = quantileOf(sorted, 0.5)
  const deviations = sorted
    .map((value) => Math.abs(value - median))
    .sort((left, right) => left - right)
  const mad = quantileOf(deviations, 0.5)
  const p10 = quantileOf(sorted, 0.1)
  const p90 = quantileOf(sorted, 0.9)
  // MAD 為 0 時（半數以上樣本同值）逐步退回更寬的離散度估計
  const iqr = quantileOf(sorted, 0.75) - quantileOf(sorted, 0.25)
  const scale =
    mad > 0
      ? mad * MAD_TO_SIGMA
      : iqr > 0
        ? iqr * IQR_TO_SIGMA
        : (p90 - p10) / 2.563
  return { count: sorted.length, median, scale, p10, p90 }
}

export const radarZScore = (value: number, stat: RadarRobustStat) =>
  stat.scale > 0 ? (value - stat.median) / stat.scale : 0

/** 尺寸特徵：受延伸性影響，需先依複雜度 detrend 再比較 */
const SIZE_TREND_KEYS = new Set(['face:widthRatio', 'face:heightRatio'])

/** 複雜度代理值：墨水面積開根號（≈ 筆畫數 × 筆畫尺度），對 UPM 正規化 */
export const glyphComplexity = (
  sample: GlyphGeometrySample,
  unitsPerEm: number
) => Math.sqrt(Math.max(0, sample.ink.inkArea)) / unitsPerEm

const fitTrendSlope = (pairs: Array<[number, number]>) => {
  if (pairs.length < MIN_RADAR_SAMPLES) {
    return 0
  }
  let meanX = 0
  let meanY = 0
  for (const [x, y] of pairs) {
    meanX += x
    meanY += y
  }
  meanX /= pairs.length
  meanY /= pairs.length
  let covariance = 0
  let variance = 0
  for (const [x, y] of pairs) {
    covariance += (x - meanX) * (y - meanY)
    variance += (x - meanX) * (x - meanX)
  }
  // 延伸性只允許正相關；負斜率多半是雜訊，套用會反向「修正」
  return variance > 0 ? Math.max(0, covariance / variance) : 0
}

const buildSizeTrend = (
  glyphFeatures: Array<{ complexity: number; features: RadarFeatureValue[] }>
): RadarSizeTrend => {
  const complexityStat = buildRobustStat(
    glyphFeatures.map((entry) => entry.complexity)
  )
  const slopeByKey = new Map<string, number>()
  for (const key of SIZE_TREND_KEYS) {
    const pairs: Array<[number, number]> = []
    for (const entry of glyphFeatures) {
      const feature = entry.features.find((candidate) => candidate.key === key)
      if (feature) {
        pairs.push([entry.complexity, feature.value])
      }
    }
    slopeByKey.set(key, fitTrendSlope(pairs))
  }
  return { medianComplexity: complexityStat?.median ?? 0, slopeByKey }
}

/** 把尺寸特徵換算成「中位複雜度下」的等效值，使分布可跨複雜度比較 */
const detrendValue = (
  feature: RadarFeatureValue,
  complexity: number,
  sizeTrend: RadarSizeTrend
) => {
  const slope = sizeTrend.slopeByKey.get(feature.key)
  if (!slope) {
    return feature.value
  }
  return feature.value - slope * (complexity - sizeTrend.medianComplexity)
}

const RADAR_DIMENSIONS: RadarDimension[] = [
  'boundary',
  'proportion',
  'ink',
  'balance',
]

interface FeatureEvaluation {
  score: number
  reasons: RadarReason[]
  outlierDimensions: Set<RadarDimension>
}

const evaluateFeatures = (
  features: RadarFeatureValue[],
  complexity: number,
  featureStats: Map<string, RadarRobustStat>,
  sizeTrend: RadarSizeTrend
): FeatureEvaluation => {
  const reasons: RadarReason[] = []
  const outlierDimensions = new Set<RadarDimension>()
  let score = 0

  for (const feature of features) {
    const stat = featureStats.get(feature.key)
    if (!stat) {
      continue
    }
    const adjusted = detrendValue(feature, complexity, sizeTrend)
    const zScore = radarZScore(adjusted, stat)
    const excess = Math.abs(zScore) - RADAR_REASON_Z
    if (excess > 0) {
      score += excess * excess
      reasons.push({
        key: feature.key,
        label: feature.label,
        dimension: feature.dimension,
        format: feature.format,
        value: feature.value,
        median: stat.median,
        // 期望值 = 此字複雜度下的迴歸預測（raw 與 detrend 的差補回中位）
        expected:
          adjusted !== feature.value
            ? stat.median + (feature.value - adjusted)
            : undefined,
        zScore,
      })
    }
    if (Math.abs(zScore) >= RADAR_OUTLIER_Z) {
      outlierDimensions.add(feature.dimension)
    }
  }

  reasons.sort((left, right) => Math.abs(right.zScore) - Math.abs(left.zScore))
  return { score, reasons, outlierDimensions }
}

/**
 * 以既有母體基準即時評估單一字形：編輯中的字每動一筆都會偏離快取的
 * evaluationByGlyphId，這條路徑讓 UI 拿「凍結的尺」量「正在動的筆」。
 */
export const evaluateSampleAgainstRadar = (
  sample: GlyphGeometrySample,
  radar: Pick<RadarAnalysis, 'featureStats' | 'sizeTrend'>,
  bodyBox: { top: number; bottom: number; unitsPerEm: number }
): RadarGlyphEvaluation => {
  const unitsPerEm = bodyBox.unitsPerEm
  const bodyCenterY = (bodyBox.top + bodyBox.bottom) / 2
  const { score, reasons } = evaluateFeatures(
    collectGlyphFeatures(sample, unitsPerEm, bodyCenterY),
    glyphComplexity(sample, unitsPerEm),
    radar.featureStats,
    radar.sizeTrend
  )
  return {
    glyphId: sample.glyphId,
    glyphName: sample.glyphName,
    character: sample.character,
    score,
    reasons,
  }
}

/**
 * 核心：從統一取樣得到的 sample 計算離群分析。
 * sample 已含 ink，故不重複攤平、不依賴 store，可在 Worker 執行。
 */
export const computeRadarFromSamples = (
  samples: GlyphGeometrySample[],
  bodyBox: { top: number; bottom: number; unitsPerEm: number }
): RadarAnalysis | null => {
  if (samples.length < MIN_RADAR_SAMPLES) {
    return null
  }

  const unitsPerEm = bodyBox.unitsPerEm
  const bodyCenterY = (bodyBox.top + bodyBox.bottom) / 2

  const glyphFeatures = samples.map((sample) => ({
    sample,
    complexity: glyphComplexity(sample, unitsPerEm),
    features: collectGlyphFeatures(sample, unitsPerEm, bodyCenterY),
  }))

  const sizeTrend = buildSizeTrend(glyphFeatures)

  // 統計分布建立在 detrend 後的值上，z-score 才不會懲罰「該小的字小」
  const valuesByFeature = new Map<string, number[]>()
  for (const entry of glyphFeatures) {
    for (const feature of entry.features) {
      const values = valuesByFeature.get(feature.key) ?? []
      values.push(detrendValue(feature, entry.complexity, sizeTrend))
      valuesByFeature.set(feature.key, values)
    }
  }

  const featureStats = new Map<string, RadarRobustStat>()
  for (const [key, values] of valuesByFeature) {
    if (values.length < MIN_RADAR_SAMPLES) {
      continue
    }
    const stat = buildRobustStat(values)
    if (stat) {
      featureStats.set(key, stat)
    }
  }

  const evaluationByGlyphId = new Map<string, RadarGlyphEvaluation>()
  const dimensionOutliers: Record<RadarDimension, number> = {
    boundary: 0,
    proportion: 0,
    ink: 0,
    balance: 0,
  }

  for (const entry of glyphFeatures) {
    const { score, reasons, outlierDimensions } = evaluateFeatures(
      entry.features,
      entry.complexity,
      featureStats,
      sizeTrend
    )
    for (const dimension of outlierDimensions) {
      dimensionOutliers[dimension] += 1
    }
    evaluationByGlyphId.set(entry.sample.glyphId, {
      glyphId: entry.sample.glyphId,
      glyphName: entry.sample.glyphName,
      character: entry.sample.character,
      score,
      reasons,
    })
  }

  const sampleCount = glyphFeatures.length
  const dimensionScores = RADAR_DIMENSIONS.map((dimension) => ({
    dimension,
    score: Math.round(100 * (1 - dimensionOutliers[dimension] / sampleCount)),
    outlierCount: dimensionOutliers[dimension],
  }))
  const overallScore = Math.round(
    dimensionScores.reduce((total, entry) => total + entry.score, 0) /
      dimensionScores.length
  )

  const suspects = [...evaluationByGlyphId.values()]
    .filter((evaluation) => evaluation.score > 0)
    .sort((left, right) => right.score - left.score)

  return {
    sampleCount,
    featureStats,
    sizeTrend,
    dimensionScores,
    overallScore,
    suspects,
    evaluationByGlyphId,
  }
}

export const formatRadarValue = (
  value: number,
  format: RadarValueFormat
): string => {
  if (format === 'units') {
    return `${Math.round(value)}`
  }
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`
  }
  return value.toFixed(2)
}

export const formatRadarReason = (reason: RadarReason) =>
  reason.expected !== undefined
    ? `${reason.label} ${formatRadarValue(reason.value, reason.format)}（同複雜度期望 ${formatRadarValue(reason.expected, reason.format)}，z ${reason.zScore.toFixed(1)}）`
    : `${reason.label} ${formatRadarValue(reason.value, reason.format)}（中位 ${formatRadarValue(reason.median, reason.format)}，z ${reason.zScore.toFixed(1)}）`

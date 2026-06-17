import type { FontAxes } from 'src/store'

// Minimal .designspace (designspaceLib) parser: axes + sources. Instances and
// avar2 cross-axis rules are out of scope for the first multi-master import.
// Source/axis locations are keyed by axis NAME (the designspace dimension key);
// FontAxis carries both name and tag so the same key flows through interpolation.

export interface DesignspaceAxis {
  name: string
  tag: string
  minimum: number
  default: number
  maximum: number
  // avar 1 piecewise map, as [userValue, designValue] pairs.
  map?: Array<[number, number]>
}

export interface DesignspaceSource {
  filename: string
  name: string
  styleName?: string
  location: Record<string, number>
}

export interface Designspace {
  axes: DesignspaceAxis[]
  sources: DesignspaceSource[]
}

const toNumber = (value: string | null | undefined, fallback = 0): number => {
  if (value == null) {
    return fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const parseDesignspace = (
  text: string,
  context = 'designspace'
): Designspace => {
  const document = new DOMParser().parseFromString(text, 'application/xml')
  if (document.querySelector('parsererror')) {
    throw new Error(`Invalid designspace: ${context}`)
  }

  const axes: DesignspaceAxis[] = Array.from(
    document.querySelectorAll('axes > axis')
  ).map((axis) => {
    const map = Array.from(axis.querySelectorAll('map')).map(
      (entry) =>
        [
          toNumber(entry.getAttribute('input')),
          toNumber(entry.getAttribute('output')),
        ] as [number, number]
    )
    return {
      name: axis.getAttribute('name') ?? '',
      tag: axis.getAttribute('tag') ?? '',
      minimum: toNumber(axis.getAttribute('minimum')),
      default: toNumber(axis.getAttribute('default')),
      maximum: toNumber(axis.getAttribute('maximum')),
      ...(map.length ? { map } : {}),
    }
  })

  const sources: DesignspaceSource[] = Array.from(
    document.querySelectorAll('sources > source')
  ).map((source) => {
    const location: Record<string, number> = {}
    for (const dimension of Array.from(
      source.querySelectorAll('location > dimension')
    )) {
      const name = dimension.getAttribute('name')
      if (!name) {
        continue
      }
      location[name] = toNumber(
        dimension.getAttribute('xvalue') ??
          dimension.getAttribute('uservalue') ??
          dimension.getAttribute('value')
      )
    }
    const filename = source.getAttribute('filename') ?? ''
    return {
      filename,
      name:
        source.getAttribute('name') ??
        source.getAttribute('stylename') ??
        filename,
      styleName: source.getAttribute('stylename') ?? undefined,
      location,
    }
  })

  return { axes, sources }
}

export const designspaceToFontAxes = (designspace: Designspace): FontAxes => ({
  axes: designspace.axes.map((axis) => ({
    name: axis.name,
    label: axis.name,
    tag: axis.tag,
    minValue: axis.minimum,
    defaultValue: axis.default,
    maxValue: axis.maximum,
    ...(axis.map ? { mapping: axis.map } : {}),
  })),
  mappings: [],
})

// The design-space point where every axis is at its default — the default source
// sits here.
export const designspaceDefaultLocation = (
  designspace: Designspace
): Record<string, number> =>
  Object.fromEntries(designspace.axes.map((axis) => [axis.name, axis.default]))

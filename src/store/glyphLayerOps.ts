// Pure helpers for Glyphs-style backup layers. The active layer is the editable
// "hot" content held at the GlyphData top level; backup layers are outline
// snapshots kept in GlyphData.layers. These functions are immutable so they can
// be unit-tested without the store, and are wrapped by glyphActions.

import type { GlyphData, GlyphLayerData } from 'src/store/types'

interface LayerContent {
  paths: GlyphLayerData['paths']
  components: GlyphLayerData['components']
  componentRefs: GlyphLayerData['componentRefs']
  anchors: GlyphLayerData['anchors']
  guidelines: GlyphLayerData['guidelines']
  metrics: GlyphLayerData['metrics']
}

const masterLayerId = (glyph: GlyphData): string =>
  glyph.activeLayerId ?? 'public.default'

// Snapshots are deep-copied so a backup never shares mutable arrays with the
// hot content (or vice versa).
const clone = <T>(value: T): T => structuredClone(value)

const snapshotHot = (glyph: GlyphData): LayerContent => ({
  paths: clone(glyph.paths),
  components: clone(glyph.components),
  componentRefs: clone(glyph.componentRefs),
  anchors: clone(glyph.anchors ?? []),
  guidelines: clone(glyph.guidelines ?? []),
  metrics: clone(glyph.metrics),
})

const contentOf = (layer: GlyphLayerData): LayerContent => ({
  paths: clone(layer.paths),
  components: clone(layer.components),
  componentRefs: clone(layer.componentRefs),
  anchors: clone(layer.anchors),
  guidelines: clone(layer.guidelines),
  metrics: clone(layer.metrics),
})

// The list shown in the layer panel: the active master (synthesised from the
// hot content) followed by backup layers in order.
export const listGlyphLayers = (glyph: GlyphData): GlyphLayerData[] => {
  const masterId = masterLayerId(glyph)
  const layers = glyph.layers ?? {}
  const order = glyph.layerOrder ?? Object.keys(layers)

  const master: GlyphLayerData = {
    id: masterId,
    name: layers[masterId]?.name ?? 'Master',
    type: 'master',
    associatedMasterId: masterId,
    ...snapshotHot(glyph),
  }

  const backups = order
    .filter((layerId) => layerId !== masterId)
    .map((layerId) => layers[layerId])
    .filter((layer): layer is GlyphLayerData => Boolean(layer))
    .map((layer) => ({ ...layer, type: 'backup' as const }))

  return [master, ...backups]
}

// A backup layer's id is its display name (a date-time string). Collisions are
// disambiguated with " (2)", " (3)", … so the id stays unique without a
// separate name table — the UFO layer name carries the name on round-trip.
const uniqueLayerId = (
  baseName: string,
  glyph: GlyphData,
  ignoreId?: string
): string => {
  const taken = new Set(Object.keys(glyph.layers ?? {}))
  taken.add(masterLayerId(glyph))
  if (ignoreId) {
    taken.delete(ignoreId)
  }
  if (!taken.has(baseName)) {
    return baseName
  }
  let counter = 2
  while (taken.has(`${baseName} (${counter})`)) {
    counter += 1
  }
  return `${baseName} (${counter})`
}

export const createBackupLayer = (
  glyph: GlyphData,
  name: string
): GlyphData => {
  const id = uniqueLayerId(name, glyph)
  const layers = { ...(glyph.layers ?? {}) }
  layers[id] = {
    id,
    name: id,
    type: 'backup',
    associatedMasterId: masterLayerId(glyph),
    ...snapshotHot(glyph),
  }
  return { ...glyph, layers, layerOrder: [...(glyph.layerOrder ?? []), id] }
}

export const duplicateLayer = (
  glyph: GlyphData,
  sourceId: string,
  name: string
): GlyphData => {
  const source =
    sourceId === masterLayerId(glyph)
      ? snapshotHot(glyph)
      : glyph.layers?.[sourceId]
        ? contentOf(glyph.layers[sourceId])
        : null
  if (!source) {
    return glyph
  }
  const id = uniqueLayerId(name, glyph)
  const layers = { ...(glyph.layers ?? {}) }
  layers[id] = {
    id,
    name: id,
    type: 'backup',
    associatedMasterId: masterLayerId(glyph),
    ...source,
  }
  return { ...glyph, layers, layerOrder: [...(glyph.layerOrder ?? []), id] }
}

export const deleteBackupLayer = (
  glyph: GlyphData,
  layerId: string
): GlyphData => {
  // The master (active) layer cannot be deleted from the panel.
  if (layerId === masterLayerId(glyph) || !glyph.layers?.[layerId]) {
    return glyph
  }
  const layers = { ...glyph.layers }
  delete layers[layerId]
  const layerOrder = (glyph.layerOrder ?? []).filter((id) => id !== layerId)
  return { ...glyph, layers, layerOrder }
}

// Renaming re-keys the layer (id === name), so the new name survives the UFO
// round-trip without a separate name table.
export const renameBackupLayer = (
  glyph: GlyphData,
  layerId: string,
  name: string
): GlyphData => {
  const layer = glyph.layers?.[layerId]
  if (!layer) {
    return glyph
  }
  const id = uniqueLayerId(name, glyph, layerId)
  if (id === layerId) {
    return glyph
  }
  const layers = { ...glyph.layers }
  delete layers[layerId]
  layers[id] = { ...layer, id, name: id }
  const layerOrder = (glyph.layerOrder ?? []).map((existing) =>
    existing === layerId ? id : existing
  )
  return { ...glyph, layers, layerOrder }
}

// Glyphs "Use as Master": the backup's content moves onto the master layer, and
// the master's previous content is kept as a new backup. The promoted backup is
// removed.
export const promoteBackupToMaster = (
  glyph: GlyphData,
  backupId: string,
  newBackupName: string
): GlyphData => {
  const backup = glyph.layers?.[backupId]
  if (!backup) {
    return glyph
  }
  const newId = uniqueLayerId(newBackupName, glyph, backupId)
  const layers = { ...glyph.layers }
  delete layers[backupId]
  layers[newId] = {
    id: newId,
    name: newId,
    type: 'backup',
    associatedMasterId: masterLayerId(glyph),
    ...snapshotHot(glyph),
  }
  const layerOrder = (glyph.layerOrder ?? []).map((id) =>
    id === backupId ? newId : id
  )
  if (!layerOrder.includes(newId)) {
    layerOrder.push(newId)
  }
  return { ...glyph, ...contentOf(backup), layers, layerOrder }
}

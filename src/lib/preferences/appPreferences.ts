import {
  createDefaultOverviewCustomFilters,
  normalizeOverviewCustomFilters,
  type OverviewCustomFilter,
} from 'src/lib/glyph/glyphOverview'

const OVERVIEW_CUSTOM_FILTERS_STORAGE_KEY =
  'kumiko.app.overviewCustomFilters.v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const getLocalStorage = (): StorageLike | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const loadAppOverviewCustomFilters = (
  storage: StorageLike | null = getLocalStorage()
): OverviewCustomFilter[] => {
  if (!storage) {
    return createDefaultOverviewCustomFilters()
  }

  try {
    const rawFilters = storage.getItem(OVERVIEW_CUSTOM_FILTERS_STORAGE_KEY)
    if (rawFilters === null) {
      return createDefaultOverviewCustomFilters()
    }
    const parsedFilters = JSON.parse(rawFilters) as unknown
    return Array.isArray(parsedFilters)
      ? normalizeOverviewCustomFilters(parsedFilters)
      : createDefaultOverviewCustomFilters()
  } catch {
    return createDefaultOverviewCustomFilters()
  }
}

export const saveAppOverviewCustomFilters = (
  filters: OverviewCustomFilter[],
  storage: StorageLike | null = getLocalStorage()
) => {
  const normalizedFilters = normalizeOverviewCustomFilters(filters)
  if (!storage) {
    return normalizedFilters
  }

  try {
    storage.setItem(
      OVERVIEW_CUSTOM_FILTERS_STORAGE_KEY,
      JSON.stringify(normalizedFilters)
    )
  } catch {
    // Keep runtime state usable even when browser storage is disabled or full.
  }
  return normalizedFilters
}

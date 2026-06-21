import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  defaultGlyphPackages,
  type DefaultGlyphPackage,
} from 'src/features/fontOverview/data/defaultGlyphPackages'
import {
  buildGlyphLookupMap,
  computeCharsetCoverage,
} from 'src/lib/charsetCoverage'
import type { GlyphData } from 'src/store'

export interface GlyphPackageSelection {
  glyphNames: string[]
  drawnCount: number
  emptyGlyphNames: string[]
  missingGlyphNames: string[]
  packages: DefaultGlyphPackage[]
}

interface UseGlyphPackageSelectionOptions {
  glyphMap: Record<string, GlyphData>
  onSelectionChange: (selection: GlyphPackageSelection) => void
}

const getPackageGlyphNames = (packages: DefaultGlyphPackage[]) => {
  const glyphNames = new Set<string>()
  for (const glyphPackage of packages) {
    for (const glyphName of glyphPackage.glyphNames) {
      glyphNames.add(glyphName)
    }
  }
  return glyphNames
}

const addPackageDependencies = (
  nextSelectedIds: Set<string>,
  glyphPackage: DefaultGlyphPackage,
  packageById: Map<string, DefaultGlyphPackage>
) => {
  nextSelectedIds.add(glyphPackage.id)
  for (const dependencyId of glyphPackage.dependsOn) {
    const dependency = packageById.get(dependencyId)
    if (dependency) {
      addPackageDependencies(nextSelectedIds, dependency, packageById)
    }
  }
}

const removePackageDependents = (
  nextSelectedIds: Set<string>,
  removedPackageId: string
) => {
  nextSelectedIds.delete(removedPackageId)
  for (const glyphPackage of defaultGlyphPackages) {
    if (
      nextSelectedIds.has(glyphPackage.id) &&
      glyphPackage.dependsOn.includes(removedPackageId)
    ) {
      removePackageDependents(nextSelectedIds, glyphPackage.id)
    }
  }
}

export function useGlyphPackageSelection({
  glyphMap,
  onSelectionChange,
}: UseGlyphPackageSelectionOptions) {
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(
    () => new Set(['zh-basic'])
  )
  const packageById = useMemo(
    () =>
      new Map(
        defaultGlyphPackages.map((glyphPackage) => [
          glyphPackage.id,
          glyphPackage,
        ])
      ),
    []
  )
  const glyphLookup = useMemo(() => buildGlyphLookupMap(glyphMap), [glyphMap])
  const coverageByPackageId = useMemo(
    () =>
      new Map(
        defaultGlyphPackages.map((glyphPackage) => [
          glyphPackage.id,
          computeCharsetCoverage(glyphPackage, glyphLookup),
        ])
      ),
    [glyphLookup]
  )
  const selectedPackages = useMemo(
    () =>
      defaultGlyphPackages.filter((glyphPackage) =>
        selectedPackageIds.has(glyphPackage.id)
      ),
    [selectedPackageIds]
  )
  const selectedGlyphNames = useMemo(
    () => getPackageGlyphNames(selectedPackages),
    [selectedPackages]
  )
  const selectedCoverage = useMemo(
    () =>
      computeCharsetCoverage(
        {
          id: 'selected',
          label: 'Selected',
          group: 'selected',
          section: 'selected',
          glyphNames: Array.from(selectedGlyphNames),
        },
        glyphLookup
      ),
    [glyphLookup, selectedGlyphNames]
  )

  useEffect(() => {
    onSelectionChange({
      glyphNames: Array.from(selectedGlyphNames),
      drawnCount: selectedCoverage.drawnCount,
      emptyGlyphNames: selectedCoverage.emptyGlyphNames,
      missingGlyphNames: selectedCoverage.missingGlyphNames,
      packages: selectedPackages,
    })
  }, [
    onSelectionChange,
    selectedCoverage,
    selectedGlyphNames,
    selectedPackages,
  ])

  const togglePackage = useCallback(
    (glyphPackage: DefaultGlyphPackage) => {
      setSelectedPackageIds((current) => {
        const nextSelectedIds = new Set(current)
        if (nextSelectedIds.has(glyphPackage.id)) {
          removePackageDependents(nextSelectedIds, glyphPackage.id)
        } else {
          addPackageDependencies(nextSelectedIds, glyphPackage, packageById)
        }
        return nextSelectedIds
      })
    },
    [packageById]
  )

  return {
    coverageByPackageId,
    selectedPackageIds,
    togglePackage,
  }
}

import { Box, Grid, GridItem, Stack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { FeatureFeaWorkspace } from 'src/features/common/projectControl/fontSettings/features/components/FeatureFeaWorkspace'
import { FeatureSummary } from 'src/features/common/projectControl/fontSettings/features/components/FeatureSummary'
import {
  FeatureWorkbenchSidebar,
  type FeatureWorkbenchSelection,
} from 'src/features/common/projectControl/fontSettings/features/components/FeatureWorkbenchSidebar'
import {
  applyAutoFeatureSuggestion,
  buildAutoFeatureSuggestions,
  classifyRawFeatureTextSource,
  generateFea,
  ignoreAutoFeatureSuggestion,
  mergeFeatureDiagnostics,
  setRawFeatureTextSource,
  validateFeatures,
  type AutoFeatureSuggestion,
  type ExportPolicy,
  type OpenTypeFeaturesState,
} from 'src/lib/openTypeFeatures'
import type { FontData } from 'src/store'

interface FontFeaturesTabProps {
  fontData: FontData | null
  openTypeFeatures: OpenTypeFeaturesState
  onOpenTypeFeaturesChange: (value: OpenTypeFeaturesState) => void
}

export function FontFeaturesTab({
  fontData,
  openTypeFeatures,
  onOpenTypeFeaturesChange,
}: FontFeaturesTabProps) {
  const [selected, setSelected] = useState<FeatureWorkbenchSelection>({
    kind: 'source',
  })
  const diagnostics = useMemo(
    () =>
      fontData
        ? mergeFeatureDiagnostics(
            openTypeFeatures.diagnostics,
            validateFeatures(openTypeFeatures, fontData)
          )
        : (openTypeFeatures.diagnostics ?? []),
    [fontData, openTypeFeatures]
  )
  const generatedFea = useMemo(
    () => generateFea(openTypeFeatures),
    [openTypeFeatures]
  )
  const suggestions = useMemo(
    () =>
      fontData ? buildAutoFeatureSuggestions(fontData, openTypeFeatures) : [],
    [fontData, openTypeFeatures]
  )

  const acceptSuggestion = (suggestion: AutoFeatureSuggestion) => {
    onOpenTypeFeaturesChange(
      applyAutoFeatureSuggestion(openTypeFeatures, suggestion)
    )
  }

  const ignoreSuggestion = (suggestion: AutoFeatureSuggestion) => {
    onOpenTypeFeaturesChange(
      ignoreAutoFeatureSuggestion(openTypeFeatures, suggestion)
    )
  }

  const updateExportPolicy = (exportPolicy: ExportPolicy) => {
    onOpenTypeFeaturesChange({ ...openTypeFeatures, exportPolicy })
  }

  const updateRawFeatureText = (rawFeatureText: string) => {
    onOpenTypeFeaturesChange(
      classifyRawFeatureTextSource(
        setRawFeatureTextSource(openTypeFeatures, rawFeatureText, {
          origin: 'manual-input',
        }),
        { origin: 'manual-input' }
      )
    )
  }

  const selectedFeature =
    selected.kind === 'feature'
      ? (openTypeFeatures.features.find(
          (feature) => feature.id === selected.featureId
        ) ?? null)
      : null
  const activeSelection = selectedFeature
    ? selected
    : ({ kind: 'source' } as const)

  return (
    <Stack spacing={5} h="100%" minH={0}>
      <FeatureSummary state={openTypeFeatures} diagnostics={diagnostics} />
      <Grid
        gap={5}
        flex={1}
        minH={0}
        overflow="hidden"
        templateColumns={{ base: '1fr', lg: '280px minmax(0, 1fr)' }}
      >
        <GridItem minH={0} overflow="auto" pr={{ base: 0, lg: 1 }}>
          <FeatureWorkbenchSidebar
            diagnostics={diagnostics}
            selected={activeSelection}
            state={openTypeFeatures}
            suggestionsCount={suggestions.length}
            onSelect={setSelected}
          />
        </GridItem>
        <GridItem minH={0} minW={0} overflow="auto" pr={1}>
          <Box pb={1}>
            <FeatureFeaWorkspace
              diagnostics={diagnostics}
              generatedFea={generatedFea}
              rawFeatureText={openTypeFeatures.rawFeatureText ?? ''}
              selectedFeature={selectedFeature}
              state={openTypeFeatures}
              suggestions={suggestions}
              onAcceptSuggestion={acceptSuggestion}
              onExportPolicyChange={updateExportPolicy}
              onIgnoreSuggestion={ignoreSuggestion}
              onRawFeatureTextChange={updateRawFeatureText}
              onScanSuggestions={() =>
                onOpenTypeFeaturesChange({ ...openTypeFeatures })
              }
            />
          </Box>
        </GridItem>
      </Grid>
    </Stack>
  )
}

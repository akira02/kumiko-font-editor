import {
  Badge,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { FeatureWorkflowPanel } from 'src/features/common/projectControl/fontSettings/features/components/FeatureWorkflowPanel'
import { GeneratedFeaPreview } from 'src/features/common/projectControl/fontSettings/features/components/GeneratedFeaPreview'
import { SourceReferenceSummary } from 'src/features/common/projectControl/fontSettings/features/components/SourceReferenceSummary'
import {
  deriveOpenTypeSourceSectionRecords,
  findOpenTypeSourceSectionsForRecord,
  type AutoFeatureSuggestion,
  type ExportPolicy,
  type FeatureDiagnostic,
  type FeatureRecord,
  type GeneratedFeaSourceMap,
  type OpenTypeFeaturesState,
} from 'src/lib/openTypeFeatures'
import { useTranslation } from 'react-i18next'

interface FeatureFeaWorkspaceProps {
  diagnostics: FeatureDiagnostic[]
  generatedFea: {
    sourceMap: GeneratedFeaSourceMap
    text: string
  }
  rawFeatureText: string
  selectedFeature: FeatureRecord | null
  state: OpenTypeFeaturesState
  suggestions: AutoFeatureSuggestion[]
  onAcceptSuggestion: (suggestion: AutoFeatureSuggestion) => void
  onExportPolicyChange: (exportPolicy: ExportPolicy) => void
  onIgnoreSuggestion: (suggestion: AutoFeatureSuggestion) => void
  onRawFeatureTextChange: (value: string) => void
  onScanSuggestions: () => void
}

export function FeatureFeaWorkspace({
  diagnostics,
  generatedFea,
  rawFeatureText,
  selectedFeature,
  state,
  suggestions,
  onAcceptSuggestion,
  onExportPolicyChange,
  onIgnoreSuggestion,
  onRawFeatureTextChange,
  onScanSuggestions,
}: FeatureFeaWorkspaceProps) {
  const { t } = useTranslation()

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <HStack justify="space-between" align="flex-start" gap={3}>
          <Stack spacing={1} minW={0}>
            <HStack wrap="wrap">
              <Text fontWeight="semibold">
                {t('projectControl.feaWorkspace')}
              </Text>
              {selectedFeature ? (
                <Badge fontFamily="mono">{selectedFeature.tag}</Badge>
              ) : null}
            </HStack>
            <Text fontSize="sm" color="field.muted">
              {t('projectControl.feaWorkspaceHelp')}
            </Text>
          </Stack>
          <Badge flexShrink={0} colorScheme="cyan">
            {state.exportPolicy}
          </Badge>
        </HStack>
      </Stack>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
        <RawFeatureTextEditor
          rawFeatureText={rawFeatureText}
          onRawFeatureTextChange={onRawFeatureTextChange}
        />
        <GeneratedFeaPreview
          feaText={generatedFea.text}
          sourceMap={generatedFea.sourceMap}
        />
      </SimpleGrid>

      <FeatureWorkspaceContext
        selectedFeature={selectedFeature}
        state={state}
      />

      <FeatureWorkflowPanel
        diagnostics={diagnostics}
        generatedFea={generatedFea}
        showGeneratedPreview={false}
        state={state}
        suggestions={suggestions}
        onAcceptSuggestion={onAcceptSuggestion}
        onExportPolicyChange={onExportPolicyChange}
        onIgnoreSuggestion={onIgnoreSuggestion}
        onScanSuggestions={onScanSuggestions}
      />
    </Stack>
  )
}

function RawFeatureTextEditor({
  rawFeatureText,
  onRawFeatureTextChange,
}: {
  rawFeatureText: string
  onRawFeatureTextChange: (value: string) => void
}) {
  const { t } = useTranslation()

  return (
    <FormControl>
      <FormLabel fontSize="sm">{t('projectControl.rawFeatureText')}</FormLabel>
      <Textarea
        minH={{ base: '320px', xl: '520px' }}
        fontFamily="mono"
        value={rawFeatureText}
        onChange={(event) => onRawFeatureTextChange(event.target.value)}
        placeholder={t('projectControl.rawFeatureTextPlaceholder')}
      />
      <FormHelperText fontSize="xs">
        {t('projectControl.rawFeatureTextHelp')}
      </FormHelperText>
    </FormControl>
  )
}

function FeatureWorkspaceContext({
  selectedFeature,
  state,
}: {
  selectedFeature: FeatureRecord | null
  state: OpenTypeFeaturesState
}) {
  if (selectedFeature) {
    return <SelectedFeatureContext feature={selectedFeature} state={state} />
  }

  return <SourceContext state={state} />
}

function SelectedFeatureContext({
  feature,
  state,
}: {
  feature: FeatureRecord
  state: OpenTypeFeaturesState
}) {
  const { t } = useTranslation()
  const lookupIds = Array.from(
    new Set(feature.entries.flatMap((entry) => entry.lookupIds))
  )
  const sourceSectionRecords = findOpenTypeSourceSectionsForRecord(state, {
    kind: 'feature',
    id: feature.id,
  })

  return (
    <Stack spacing={3} borderTopWidth="1px" pt={4}>
      <HStack wrap="wrap" gap={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {t('projectControl.featureContext')}
        </Text>
        <Badge fontFamily="mono">{feature.tag}</Badge>
        <Badge>{feature.origin}</Badge>
        {!feature.isActive ? (
          <Badge colorScheme="gray">{t('projectControl.inactive')}</Badge>
        ) : null}
        <Badge variant="outline">
          {feature.entries.length} {t('projectControl.records')}
        </Badge>
        <Badge variant="outline">
          {lookupIds.length} {t('projectControl.lookups')}
        </Badge>
      </HStack>
      <SourceReferenceSummary sourceSectionRecords={sourceSectionRecords} />
    </Stack>
  )
}

function SourceContext({ state }: { state: OpenTypeFeaturesState }) {
  const { t } = useTranslation()
  const sourceSectionRecords = deriveOpenTypeSourceSectionRecords(state)

  return (
    <Stack spacing={3} borderTopWidth="1px" pt={4}>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <ContextMetric
          label={t('projectControl.features')}
          value={state.features.length}
          detail={`${state.lookups.length} ${t('projectControl.lookups')}`}
        />
        <ContextMetric
          label={t('projectControl.languageSystems')}
          value={state.languagesystems.length}
          detail={state.languagesystems
            .slice(0, 3)
            .map(
              (languageSystem) =>
                `${languageSystem.script} ${languageSystem.language}`
            )
            .join(' / ')}
        />
        <ContextMetric
          label={t('projectControl.classes')}
          value={state.glyphClasses.length + state.markClasses.length}
          detail={`${state.glyphClasses.length} ${t('projectControl.glyph')} / ${state.markClasses.length} ${t('projectControl.markClasses')}`}
        />
      </SimpleGrid>
      <SourceReferenceSummary sourceSectionRecords={sourceSectionRecords} />
    </Stack>
  )
}

function ContextMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: number
}) {
  return (
    <Stack borderWidth="1px" borderRadius="sm" p={3} spacing={1}>
      <Text fontSize="xs" color="field.muted">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="900">
        {value}
      </Text>
      <Text fontSize="xs" color="field.muted" noOfLines={1}>
        {detail || 'none'}
      </Text>
    </Stack>
  )
}

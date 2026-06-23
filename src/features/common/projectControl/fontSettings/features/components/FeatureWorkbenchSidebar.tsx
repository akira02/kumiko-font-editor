import { Badge, Button, HStack, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type {
  FeatureDiagnostic,
  FeatureRecord,
  OpenTypeFeaturesState,
  OpenTypeTableTag,
} from 'src/lib/openTypeFeatures'
import { useTranslation } from 'react-i18next'

export type FeatureWorkbenchSelection =
  | { kind: 'source' }
  | { kind: 'feature'; featureId: string }

interface FeatureWorkbenchSidebarProps {
  diagnostics: FeatureDiagnostic[]
  selected: FeatureWorkbenchSelection
  state: OpenTypeFeaturesState
  suggestionsCount: number
  onSelect: (selection: FeatureWorkbenchSelection) => void
}

export function FeatureWorkbenchSidebar({
  diagnostics,
  selected,
  state,
  suggestionsCount,
  onSelect,
}: FeatureWorkbenchSidebarProps) {
  const { t } = useTranslation()
  const tableSummaries = getLayoutTableSummaries(state)

  return (
    <Stack
      spacing={4}
      borderRightWidth={{ base: 0, lg: '1px' }}
      pr={{ base: 0, lg: 4 }}
      minW={0}
    >
      <SidebarSection title={t('projectControl.sourceAndBuild')}>
        <SidebarButton
          isSelected={selected.kind === 'source'}
          label=".fea"
          detail={`${state.languagesystems.length} ${t('projectControl.languageSystems')} / ${state.sourceSections.length} ${t('projectControl.sourceSections')}`}
          metaBadge={
            state.rawFeatureText?.trim()
              ? t('projectControl.editable')
              : t('projectControl.generatedDisposableFea')
          }
          onClick={() => onSelect({ kind: 'source' })}
        />
        <SidebarStatusRow
          label={t('projectControl.workflow')}
          detail={`${suggestionsCount} ${t('projectControl.autoFeatureSuggestions')} / ${state.unsupportedLookups.length} ${t('projectControl.unsupported')}`}
          badge={diagnosticsForWorkflow(diagnostics)}
        />
      </SidebarSection>

      <SidebarSection title={t('projectControl.featuresSection')}>
        {state.features.length === 0 ? (
          <Text fontSize="sm" color="field.muted">
            {t('projectControl.noFeaturesYet')}
          </Text>
        ) : (
          state.features.map((feature) => (
            <SidebarButton
              key={feature.id}
              isSelected={
                selected.kind === 'feature' && selected.featureId === feature.id
              }
              label={feature.tag}
              detail={getFeatureDetail(feature)}
              metaBadge={getFeatureTable(feature)}
              badge={diagnosticsForFeature(diagnostics, feature.id)}
              onClick={() =>
                onSelect({ kind: 'feature', featureId: feature.id })
              }
            />
          ))
        )}
      </SidebarSection>

      <SidebarSection title={t('projectControl.usedLayoutTables')}>
        {tableSummaries.length === 0 ? (
          <Text fontSize="sm" color="field.muted">
            {t('projectControl.noUsedLayoutTables')}
          </Text>
        ) : (
          tableSummaries.map((summary) => (
            <SidebarStatusRow
              key={summary.table}
              label={summary.table}
              detail={`${summary.lookupCount} ${t('projectControl.lookups')} / ${summary.sourceCount} ${t('projectControl.sourceSections')}`}
              badge={summary.unsupportedCount}
            />
          ))
        )}
      </SidebarSection>

      <SidebarSection title={t('projectControl.featureResources')}>
        <SidebarStatusRow
          label={t('projectControl.classes')}
          detail={`${state.glyphClasses.length} ${t('projectControl.glyphClasses')} / ${state.markClasses.length} ${t('projectControl.markClasses')}`}
        />
      </SidebarSection>
    </Stack>
  )
}

function SidebarSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <Stack spacing={2}>
      <Text fontSize="xs" fontWeight="900" color="field.muted">
        {title}
      </Text>
      {children}
    </Stack>
  )
}

function SidebarButton({
  badge = 0,
  detail,
  isSelected,
  label,
  metaBadge,
  onClick,
}: {
  badge?: number
  detail: string
  isSelected: boolean
  label: string
  metaBadge?: string
  onClick: () => void
}) {
  return (
    <Button
      h="auto"
      justifyContent="flex-start"
      p={3}
      textAlign="left"
      variant={isSelected ? 'solid' : 'ghost'}
      whiteSpace="normal"
      onClick={onClick}
    >
      <Stack spacing={1} align="stretch" w="100%">
        <HStack justify="space-between" minW={0}>
          <HStack minW={0} gap={2}>
            <Text fontFamily="mono" fontWeight="900" noOfLines={1}>
              {label}
            </Text>
            {metaBadge ? (
              <Badge flexShrink={0} variant="outline">
                {metaBadge}
              </Badge>
            ) : null}
          </HStack>
          {badge > 0 ? (
            <Badge flexShrink={0} colorScheme="yellow">
              {badge}
            </Badge>
          ) : null}
        </HStack>
        <Text fontSize="xs" color={isSelected ? undefined : 'field.muted'}>
          {detail}
        </Text>
      </Stack>
    </Button>
  )
}

function SidebarStatusRow({
  badge = 0,
  detail,
  label,
}: {
  badge?: number
  detail: string
  label: string
}) {
  return (
    <Stack borderWidth="1px" borderRadius="sm" p={3} spacing={1}>
      <HStack justify="space-between" gap={2}>
        <Text fontFamily="mono" fontWeight="900" noOfLines={1}>
          {label}
        </Text>
        {badge > 0 ? (
          <Badge flexShrink={0} colorScheme="yellow">
            {badge}
          </Badge>
        ) : null}
      </HStack>
      <Text fontSize="xs" color="field.muted">
        {detail}
      </Text>
    </Stack>
  )
}

function diagnosticsForFeature(
  diagnostics: FeatureDiagnostic[],
  featureId: string
) {
  return diagnostics.filter(
    (diagnostic) =>
      diagnostic.target.kind === 'feature' &&
      diagnostic.target.featureId === featureId
  ).length
}

function diagnosticsForWorkflow(diagnostics: FeatureDiagnostic[]) {
  return diagnostics.filter((diagnostic) => diagnostic.target.kind === 'global')
    .length
}

function getFeatureDetail(feature: FeatureRecord) {
  const lookupCount = new Set(
    feature.entries.flatMap((entry) => entry.lookupIds)
  ).size

  return `${feature.entries.length} entries / ${lookupCount} lookups`
}

function getFeatureTable(feature: FeatureRecord) {
  const table = feature.meta?.table
  return typeof table === 'string' ? table : undefined
}

function getLayoutTableSummaries(state: OpenTypeFeaturesState) {
  const tables: OpenTypeTableTag[] = ['GSUB', 'GPOS', 'GDEF']

  return tables
    .map((table) => {
      const featureCount = state.features.filter(
        (feature) => feature.meta?.table === table
      ).length
      const lookupCount = state.lookups.filter(
        (lookup) => lookup.table === table
      ).length
      const sourceCount = state.sourceSections.filter(
        (sourceSection) => sourceSection.table === table
      ).length
      const unsupportedCount = state.unsupportedLookups.filter(
        (lookup) => lookup.table === table
      ).length

      return {
        featureCount,
        lookupCount,
        sourceCount,
        table,
        unsupportedCount,
      }
    })
    .filter(
      (summary) =>
        summary.featureCount > 0 ||
        summary.lookupCount > 0 ||
        summary.sourceCount > 0 ||
        summary.unsupportedCount > 0
    )
}

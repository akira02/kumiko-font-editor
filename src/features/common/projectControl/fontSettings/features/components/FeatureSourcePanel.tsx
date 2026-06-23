import {
  Badge,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import {
  deriveOpenTypeSourceSectionRecords,
  type OpenTypeFeaturesState,
  type SourceSectionRecordGroup,
  type SourceSectionRecordSummary,
} from 'src/lib/openTypeFeatures'
import { useTranslation } from 'react-i18next'

interface FeatureSourcePanelProps {
  rawFeatureText: string
  state: OpenTypeFeaturesState
  onRawFeatureTextChange: (value: string) => void
}

export function FeatureSourcePanel({
  rawFeatureText,
  state,
  onRawFeatureTextChange,
}: FeatureSourcePanelProps) {
  const { t } = useTranslation()
  const sourceSectionRecords = deriveOpenTypeSourceSectionRecords(state)

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Text fontWeight="semibold">{t('projectControl.source')}</Text>
        <Text fontSize="sm" color="field.muted">
          {t('projectControl.featureSourceDataFlow')}
        </Text>
      </Stack>

      <Stack spacing={2}>
        <Text fontSize="xs" color="field.muted">
          {t('projectControl.languageSystems')}
        </Text>
        <HStack wrap="wrap">
          {state.languagesystems.map((languageSystem) => (
            <Badge key={languageSystem.id} fontFamily="mono">
              {languageSystem.script} {languageSystem.language}
            </Badge>
          ))}
        </HStack>
      </Stack>

      <Stack spacing={2}>
        <Text fontSize="xs" color="field.muted">
          {t('projectControl.sourceSections')}
        </Text>
        {sourceSectionRecords.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {sourceSectionRecords.map((sectionRecords) => (
              <SourceSectionCard
                key={sectionRecords.section.id}
                recordsLabel={t('projectControl.records')}
                recordRefsLabel={t('projectControl.sourceRecordRefs')}
                sectionRecords={sectionRecords}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Text fontSize="sm" color="field.muted">
            {t('projectControl.noSourceSections')}
          </Text>
        )}
      </Stack>

      <FormControl>
        <FormLabel fontSize="sm">
          {t('projectControl.rawFeatureText')}
        </FormLabel>
        <Textarea
          minH="180px"
          fontFamily="mono"
          value={rawFeatureText}
          onChange={(event) => onRawFeatureTextChange(event.target.value)}
          placeholder={t('projectControl.rawFeatureTextPlaceholder')}
        />
        <FormHelperText fontSize="xs">
          {t('projectControl.rawFeatureTextHelp')}
        </FormHelperText>
      </FormControl>
    </Stack>
  )
}

function SourceSectionCard({
  recordRefsLabel,
  recordsLabel,
  sectionRecords,
}: {
  recordRefsLabel: string
  recordsLabel: string
  sectionRecords: SourceSectionRecordGroup
}) {
  const { section, records } = sectionRecords
  const visibleRecords = records.slice(0, 12)
  const hiddenRecordRefCount = Math.max(
    records.length - visibleRecords.length,
    0
  )
  const metaBadges = formatSourceSectionMeta(section.meta)

  return (
    <Stack borderWidth="1px" borderRadius="sm" p={3} spacing={2}>
      <HStack justify="space-between" align="flex-start" gap={2}>
        <Stack spacing={1} minW={0}>
          <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
            {section.title}
          </Text>
          <Text fontSize="xs" color="field.muted" noOfLines={1}>
            {section.path ?? section.table ?? section.format}
          </Text>
        </Stack>
        <Badge flexShrink={0}>{section.status}</Badge>
      </HStack>
      <HStack wrap="wrap" gap={2}>
        <Badge variant="subtle">{section.kind}</Badge>
        <Badge variant="subtle">{section.stage}</Badge>
        <Badge variant="subtle">{section.preservationPolicy}</Badge>
      </HStack>
      {metaBadges.length > 0 ? (
        <HStack wrap="wrap" gap={1}>
          {metaBadges.map((badge) => (
            <Badge key={badge} fontFamily="mono" variant="outline">
              {badge}
            </Badge>
          ))}
        </HStack>
      ) : null}
      <Text fontSize="xs" color="field.muted">
        {sectionRecords.resolvedCount} / {section.recordRefs.length}{' '}
        {recordsLabel}
      </Text>
      {records.length > 0 ? (
        <Stack spacing={1}>
          <Text fontSize="xs" color="field.muted">
            {recordRefsLabel}
          </Text>
          <Stack
            spacing={0}
            borderTopWidth="1px"
            divider={<Divider />}
            maxH="280px"
            overflowY="auto"
          >
            {visibleRecords.map((record, index) => (
              <SourceRecordRow
                key={`${record.kind}-${record.id}-${index}`}
                record={record}
              />
            ))}
          </Stack>
          <HStack wrap="wrap" gap={1}>
            {hiddenRecordRefCount > 0 ? (
              <Badge variant="subtle">+{hiddenRecordRefCount}</Badge>
            ) : null}
          </HStack>
        </Stack>
      ) : null}
    </Stack>
  )
}

function SourceRecordRow({ record }: { record: SourceSectionRecordSummary }) {
  const colorScheme =
    record.status === 'missing'
      ? 'red'
      : record.severity === 'error'
        ? 'red'
        : record.severity === 'warning'
          ? 'yellow'
          : record.severity === 'info'
            ? 'blue'
            : undefined

  return (
    <Stack py={2} spacing={1}>
      <HStack justify="space-between" align="flex-start" gap={2}>
        <HStack minW={0} gap={1}>
          <Badge flexShrink={0} fontFamily="mono" variant="subtle">
            {record.kind}
          </Badge>
          {record.table ? (
            <Badge flexShrink={0} variant="outline">
              {record.table}
            </Badge>
          ) : null}
          <Text
            fontSize="xs"
            fontFamily="mono"
            fontWeight="semibold"
            noOfLines={1}
          >
            {record.label}
          </Text>
        </HStack>
        <Badge flexShrink={0} colorScheme={colorScheme} variant="outline">
          {record.status}
        </Badge>
      </HStack>
      <Text fontSize="xs" color="field.muted" noOfLines={2}>
        {record.detail}
      </Text>
    </Stack>
  )
}

function formatSourceSectionMeta(meta: Record<string, unknown> | undefined) {
  if (!meta) return []

  return [
    formatNumberMeta(meta.tableOffset, 'offset'),
    formatNumberMeta(meta.featureCount, 'features'),
    formatNumberMeta(meta.lookupCount, 'lookups'),
    formatNumberMeta(meta.languageCount, 'languages'),
    formatNumberMeta(meta.extensionLookupCount, 'extensions'),
    meta.featureVariationsPresent === true ? 'FeatureVariations' : null,
    formatArrayMeta(meta.unreconstructedTableData, 'compiled-only'),
  ].filter((item): item is string => Boolean(item))
}

function formatNumberMeta(value: unknown, label: string) {
  return typeof value === 'number' ? `${label}: ${value}` : null
}

function formatArrayMeta(value: unknown, label: string) {
  return Array.isArray(value) && value.length > 0
    ? `${label}: ${value.filter((item) => typeof item === 'string').join(', ')}`
    : null
}

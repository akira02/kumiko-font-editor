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
import type {
  FeatureSourceSection,
  OpenTypeFeaturesState,
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
  const sourceSections = state.sourceSections ?? []

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
        {sourceSections.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {sourceSections.map((section) => (
              <SourceSectionCard
                key={section.id}
                recordsLabel={t('projectControl.records')}
                recordRefsLabel={t('projectControl.sourceRecordRefs')}
                section={section}
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
  section,
}: {
  recordRefsLabel: string
  recordsLabel: string
  section: FeatureSourceSection
}) {
  const visibleRecordRefs = section.recordRefs.slice(0, 10)
  const hiddenRecordRefCount = Math.max(
    section.recordRefs.length - visibleRecordRefs.length,
    0
  )

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
      <Text fontSize="xs" color="field.muted">
        {section.recordRefs.length} {recordsLabel}
      </Text>
      {section.recordRefs.length > 0 ? (
        <Stack spacing={1}>
          <Text fontSize="xs" color="field.muted">
            {recordRefsLabel}
          </Text>
          <HStack wrap="wrap" gap={1}>
            {visibleRecordRefs.map((ref, index) => (
              <Badge
                key={`${ref.kind}-${ref.id}-${index}`}
                fontFamily="mono"
                variant="outline"
              >
                {formatRecordRef(ref)}
              </Badge>
            ))}
            {hiddenRecordRefCount > 0 ? (
              <Badge variant="subtle">+{hiddenRecordRefCount}</Badge>
            ) : null}
          </HStack>
        </Stack>
      ) : null}
    </Stack>
  )
}

const formatRecordRef = (ref: FeatureSourceSection['recordRefs'][number]) =>
  `${ref.kind}${ref.table ? ` ${ref.table}` : ''}: ${ref.id}`

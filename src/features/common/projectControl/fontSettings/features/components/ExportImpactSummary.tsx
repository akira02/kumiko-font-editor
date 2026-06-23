import { Badge, HStack, Stack, Text } from '@chakra-ui/react'
import type { OpenTypeExportImpactItem } from 'src/lib/openTypeFeatures'
import { useTranslation } from 'react-i18next'

interface ExportImpactSummaryProps {
  items: OpenTypeExportImpactItem[]
}

const STATUS_COLOR: Record<OpenTypeExportImpactItem['status'], string> = {
  rebuild: 'blue',
  preserve: 'green',
  raw: 'purple',
  drop: 'orange',
  review: 'yellow',
}

export function ExportImpactSummary({ items }: ExportImpactSummaryProps) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return null
  }

  return (
    <Stack spacing={2}>
      <Text fontSize="xs" fontWeight="900" color="field.muted">
        {t('projectControl.exportImpact')}
      </Text>
      <Stack spacing={2}>
        {items.slice(0, 10).map((item) => (
          <HStack key={item.id} align="flex-start" spacing={3}>
            <Badge colorScheme={STATUS_COLOR[item.status]} flexShrink={0}>
              {item.statusLabel}
            </Badge>
            <Stack spacing={0} minW={0}>
              <HStack spacing={1} wrap="wrap">
                {item.table ? (
                  <Badge variant="outline">{item.table}</Badge>
                ) : null}
                <Text fontSize="sm" fontWeight="semibold">
                  {item.title}
                </Text>
              </HStack>
              <Text fontSize="xs" color="field.muted">
                {item.detail}
              </Text>
            </Stack>
          </HStack>
        ))}
        {items.length > 10 ? (
          <Text fontSize="xs" color="field.muted">
            +{items.length - 10} more
          </Text>
        ) : null}
      </Stack>
    </Stack>
  )
}

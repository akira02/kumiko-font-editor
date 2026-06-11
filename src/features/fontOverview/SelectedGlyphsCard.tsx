import { Box, Button, HStack, Stack, Tag, Text } from '@chakra-ui/react'
import { NavArrowRight, PageSearch, Trash } from 'iconoir-react'
import { useTranslation } from 'react-i18next'

interface SelectedGlyphsCardProps {
  selectedGlyphCount: number
  onDeleteGlyphs: () => void
  onEnterEditor: () => void
  onOpenQualityCheck: () => void
}

export function SelectedGlyphsCard({
  selectedGlyphCount,
  onDeleteGlyphs,
  onEnterEditor,
  onOpenQualityCheck,
}: SelectedGlyphsCardProps) {
  const { t } = useTranslation()

  return (
    <Box borderWidth={1} borderColor="field.line" bg="field.panel" p={4}>
      <Stack spacing={3}>
        <HStack justify="space-between" spacing={3} align="start">
          <Box>
            <Text fontSize="lg" fontWeight="900" color="field.ink">
              {t('fontOverview.selection.selectedGlyphs', {
                count: selectedGlyphCount,
              })}
            </Text>
            <Text fontSize="xs" color="field.muted" mt={1}>
              {t('fontOverview.selection.description')}
            </Text>
          </Box>
          <Tag size="sm" colorScheme="orange" flexShrink={0}>
            {t('fontOverview.selection.badge')}
          </Tag>
        </HStack>

        <Stack spacing={2}>
          <Button
            size="sm"
            leftIcon={<NavArrowRight width={14} height={14} />}
            onClick={onEnterEditor}
          >
            {t('glyphInspector.enterGlyphEditor')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<PageSearch width={14} height={14} />}
            onClick={onOpenQualityCheck}
          >
            {t('qualityCheck.title')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Trash width={14} height={14} />}
            onClick={onDeleteGlyphs}
          >
            {t('glyphInspector.deleteGlyph')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

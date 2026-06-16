import {
  Badge,
  Box,
  HStack,
  Heading,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'src/store'

interface LayerListCardProps {
  availableLayers: Array<{ id: string; name: string }>
  activeLayerId: string | null
  onSelectLayer: (layerId: string) => void
}

// Glyphs-style layer list: master layers (active = the edit surface, others
// toggle as a faint backdrop) plus a bottom, non-editable reference row.
export function LayerListCard({
  availableLayers,
  activeLayerId,
  onSelectLayer,
}: LayerListCardProps) {
  const { t } = useTranslation()
  const visibleBackdropLayerIds = useStore(
    (state) => state.visibleBackdropLayerIds
  )
  const toggleBackdropLayer = useStore((state) => state.toggleBackdropLayer)
  const referenceFontName = useStore((state) => state.referenceFontName)
  const referenceFontVisible = useStore((state) => state.referenceFontVisible)
  const setReferenceFontVisible = useStore(
    (state) => state.setReferenceFontVisible
  )

  return (
    <Box p={4} bg="field.panel" borderRadius="sm">
      <Heading size="sm" textTransform="uppercase" color="field.ink" mb={3}>
        {t('editor.layers')}
      </Heading>

      <Stack spacing={1}>
        {availableLayers.map((layer) => {
          const isActive = layer.id === activeLayerId
          return (
            <HStack
              key={layer.id}
              justify="space-between"
              px={2}
              py={1.5}
              borderRadius="sm"
              bg={isActive ? 'blackAlpha.100' : 'transparent'}
            >
              <Box
                as="button"
                type="button"
                flex="1"
                minW={0}
                textAlign="left"
                onClick={() => onSelectLayer(layer.id)}
              >
                <Text
                  fontSize="sm"
                  fontWeight={isActive ? '700' : '500'}
                  noOfLines={1}
                >
                  {layer.name || layer.id}
                </Text>
              </Box>
              {isActive ? (
                <Badge colorScheme="cyan" fontSize="2xs">
                  {t('editor.layerEditing')}
                </Badge>
              ) : (
                <Switch
                  size="sm"
                  isChecked={visibleBackdropLayerIds.includes(layer.id)}
                  onChange={() => toggleBackdropLayer(layer.id)}
                />
              )}
            </HStack>
          )
        })}

        <HStack
          justify="space-between"
          px={2}
          py={1.5}
          borderRadius="sm"
          opacity={referenceFontName ? 1 : 0.6}
        >
          <Text fontSize="sm" color="field.muted" noOfLines={1}>
            {referenceFontName
              ? `${t('editor.referenceFont')} · ${referenceFontName}`
              : t('editor.referenceFont')}
          </Text>
          <Switch
            size="sm"
            isDisabled={!referenceFontName}
            isChecked={referenceFontVisible}
            onChange={(event) => setReferenceFontVisible(event.target.checked)}
          />
        </HStack>
      </Stack>
    </Box>
  )
}

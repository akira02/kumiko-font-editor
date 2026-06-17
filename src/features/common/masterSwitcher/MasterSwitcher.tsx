import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useStore, type FontSource } from 'src/store'

const locationLabel = (source: FontSource) =>
  Object.entries(source.location)
    .map(([axis, value]) => `${axis} ${value}`)
    .join('  ')

// Font-wide master selector for the overview (the editor uses the layer panel).
// A single truncating dropdown so long, custom source names never break layout.
export function MasterSwitcher() {
  const sources = useStore((state) => state.fontData?.sources)
  const activeMasterId = useStore((state) => state.activeMasterId)
  const selectedGlyphId = useStore((state) => state.selectedGlyphId)
  const selectedGlyphLayers = useStore((state) =>
    selectedGlyphId
      ? state.fontData?.glyphs[selectedGlyphId]?.layers
      : undefined
  )
  const setActiveMasterId = useStore((state) => state.setActiveMasterId)

  const sourceList = useMemo(() => Object.values(sources ?? {}), [sources])

  if (sourceList.length <= 1) {
    return null
  }

  const currentId = activeMasterId ?? sourceList[0]?.id ?? null
  const current = sourceList.find((source) => source.id === currentId)
  const isSparse = (id: string) =>
    Boolean(selectedGlyphId) &&
    Boolean(selectedGlyphLayers) &&
    !selectedGlyphLayers?.[id]

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={Button}
        size="sm"
        variant="outline"
        minW="120px"
        maxW="220px"
        fontWeight="500"
        rightIcon={
          <Box as="span" fontSize="9px" opacity={0.6}>
            ▼
          </Box>
        }
      >
        <Text noOfLines={1} textAlign="left">
          {current?.name ?? '—'}
        </Text>
      </MenuButton>
      <MenuList maxH="360px" minW="220px" overflowY="auto">
        {sourceList.map((source) => (
          <MenuItem
            key={source.id}
            bg={source.id === currentId ? 'field.yellow.100' : undefined}
            onClick={() => setActiveMasterId(source.id)}
          >
            <HStack w="100%" justify="space-between" spacing={4}>
              <Text
                noOfLines={1}
                fontWeight={source.id === currentId ? '700' : '400'}
              >
                {source.name}
                {isSparse(source.id) ? ' +' : ''}
              </Text>
              <Text fontSize="xs" color="field.muted" flexShrink={0}>
                {locationLabel(source)}
              </Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}

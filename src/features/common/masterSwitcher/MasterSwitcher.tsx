import {
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useStore, type FontSource } from 'src/store'

// Threshold above which pills give way to a dropdown (names can be long/custom).
const PILL_LIMIT = 4

const locationLabel = (source: FontSource) =>
  Object.entries(source.location)
    .map(([axis, value]) => `${axis} ${value}`)
    .join(', ')

interface MasterSwitcherProps {
  // 'dark' for the editor canvas overlay; 'light' for the overview panel.
  tone?: 'light' | 'dark'
}

export function MasterSwitcher({ tone = 'light' }: MasterSwitcherProps) {
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

  // Single-master (or no) font: nothing to switch.
  if (sourceList.length <= 1) {
    return null
  }

  const currentId = activeMasterId ?? sourceList[0]?.id ?? null
  // sparse = the selected glyph has no layer for that master.
  const isSparse = (id: string) =>
    Boolean(selectedGlyphId) &&
    Boolean(selectedGlyphLayers) &&
    !selectedGlyphLayers?.[id]

  const dark = tone === 'dark'

  if (sourceList.length > PILL_LIMIT) {
    const current = sourceList.find((source) => source.id === currentId)
    return (
      <Menu>
        <MenuButton
          as={Button}
          size="xs"
          variant="outline"
          maxW="180px"
          color={dark ? 'whiteAlpha.900' : 'field.ink'}
          borderColor={dark ? 'whiteAlpha.400' : 'field.haze'}
          _hover={{ bg: dark ? 'whiteAlpha.200' : 'field.yellow.100' }}
        >
          {current?.name ?? '—'}
        </MenuButton>
        <MenuList maxH="320px" overflowY="auto">
          {sourceList.map((source) => (
            <MenuItem
              key={source.id}
              fontWeight={source.id === currentId ? '700' : '400'}
              command={isSparse(source.id) ? '+' : undefined}
              title={locationLabel(source)}
              onClick={() => setActiveMasterId(source.id)}
            >
              {source.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    )
  }

  return (
    <HStack spacing={1} flexShrink={0}>
      {sourceList.map((source) => {
        const isActive = source.id === currentId
        const sparse = isSparse(source.id)
        return (
          <Button
            key={source.id}
            size="xs"
            variant="outline"
            title={locationLabel(source)}
            onClick={() => setActiveMasterId(source.id)}
            maxW="140px"
            overflow="hidden"
            textOverflow="ellipsis"
            borderStyle={sparse ? 'dashed' : 'solid'}
            bg={isActive ? 'field.yellow.300' : 'transparent'}
            color={
              isActive
                ? 'field.ink'
                : sparse
                  ? dark
                    ? 'whiteAlpha.500'
                    : 'field.muted'
                  : dark
                    ? 'whiteAlpha.900'
                    : 'field.ink'
            }
            borderColor={
              isActive
                ? 'field.yellow.300'
                : dark
                  ? 'whiteAlpha.400'
                  : 'field.haze'
            }
            _hover={{ bg: isActive ? 'field.yellow.200' : 'whiteAlpha.200' }}
          >
            {source.name}
            {sparse ? ' +' : ''}
          </Button>
        )
      })}
    </HStack>
  )
}

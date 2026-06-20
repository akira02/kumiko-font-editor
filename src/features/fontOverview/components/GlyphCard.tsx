import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { memo, useCallback, useMemo, type MouseEvent } from 'react'
import {
  buildGlyphPreviewData,
  getGlyphDisplayCharacter,
} from 'src/lib/glyph/glyphOverview'
import { useStore, type GlyphData } from 'src/store'

const GlyphPreview = memo(function GlyphPreview({
  glyph,
  glyphMap,
}: {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
}) {
  const unitsPerEm = useStore((state) => state.fontData?.unitsPerEm)
  const activeMasterId = useStore((state) => state.activeMasterId)
  // Render the active master's layer (null → the glyph's own active layer).
  const preview = useMemo(
    () => buildGlyphPreviewData(glyph, glyphMap, unitsPerEm, activeMasterId),
    [glyph, glyphMap, unitsPerEm, activeMasterId]
  )
  const displayCharacter =
    getGlyphDisplayCharacter(glyph) ?? glyph.name ?? glyph

  if (!preview.shapes.length) {
    return (
      <Flex w="100%" h="100%" align="center" justify="center">
        <Text
          w="100%"
          textAlign="center"
          fontSize={displayCharacter.length > 1 ? 'sm' : '6xl'}
          fontWeight="900"
          color="field.haze"
          lineHeight={1}
          userSelect="none"
        >
          {displayCharacter}
        </Text>
      </Flex>
    )
  }

  return (
    <Box
      as="svg"
      viewBox={preview.viewBox}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      overflow="hidden"
    >
      <g transform={`matrix(1 0 0 -1 0 ${preview.flipY})`}>
        {preview.shapes.map((shape, index) => (
          <path
            key={`${glyph.id}-shape-${index}`}
            d={shape.d}
            transform={shape.transform}
            fill="currentColor"
            stroke="none"
          />
        ))}
      </g>
    </Box>
  )
})

interface GlyphCardProps {
  glyph: GlyphData
  glyphMap: Record<string, GlyphData>
  isSelected: boolean
  isTransitioning?: boolean
  onEnterEditor: (glyphId: string) => void
  onSelectGlyph: (glyphId: string, event: MouseEvent) => void
}

export const GlyphCard = memo(function GlyphCard({
  glyph,
  glyphMap,
  isSelected,
  isTransitioning,
  onEnterEditor,
  onSelectGlyph,
}: GlyphCardProps) {
  const handleClick = useCallback(
    (event: MouseEvent) => {
      onSelectGlyph(glyph.id, event)
    },
    [glyph.id, onSelectGlyph]
  )

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      event.preventDefault()
    }
  }, [])

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault()
      onEnterEditor(glyph.id)
    },
    [glyph.id, onEnterEditor]
  )

  return (
    <Box
      p={1}
      h="140px"
      sx={{ contain: 'layout paint style' }}
      borderRadius="sm"
      bg={isSelected ? 'field.yellow.300' : 'field.panel'}
      boxShadow="none"
      transition="background 60ms ease"
      userSelect="none"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >
      <Stack spacing={1} h="100%">
        <Flex align="center" justify="center" h="104px" borderRadius="sm">
          <Box
            w="100%"
            h="100%"
            style={
              isTransitioning
                ? { viewTransitionName: 'glyph-preview' }
                : undefined
            }
          >
            <GlyphPreview glyph={glyph} glyphMap={glyphMap} />
          </Box>
        </Flex>

        <Text
          fontSize="xs"
          color="field.muted"
          noOfLines={1}
          textAlign="center"
          fontFamily="mono"
        >
          {glyph.id}
        </Text>
      </Stack>
    </Box>
  )
})

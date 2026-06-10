import {
  Button,
  Divider,
  HStack,
  Stack,
  Text,
  Tooltip,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore, type GlyphData } from 'src/store'
import { ComponentSearchSection } from 'src/features/editor/leftPanel/ComponentSearchSection'
import { GlyphPreviewCard } from 'src/features/editor/leftPanel/GlyphPreviewCard'
import { GlyphPreviewStrip } from 'src/features/editor/leftPanel/GlyphPreviewStrip'
import { LeftPanelHeader } from 'src/features/editor/leftPanel/LeftPanelHeader'
import { useGlyphReferenceSearch } from 'src/features/editor/leftPanel/useGlyphReferenceSearch'

interface LeftPanelContentProps {
  glyphMap: Record<string, GlyphData>
  glyphs: GlyphData[]
  selectedGlyph: GlyphData | null
  onAddGlyphToEditor: (glyphId: string) => void
  onBack: () => void
}

const findGlyphByCharacter = (
  glyphMap: Record<string, GlyphData>,
  character: string | null | undefined
) => {
  const codePoint = character?.codePointAt(0)
  if (codePoint === undefined) {
    return null
  }
  const hex = codePoint.toString(16).toUpperCase().padStart(4, '0')
  return (
    Object.values(glyphMap).find(
      (glyph) => glyph.unicode?.toUpperCase() === hex
    ) ?? null
  )
}

export function LeftPanelContent({
  glyphMap,
  glyphs,
  selectedGlyph,
  onAddGlyphToEditor,
  onBack,
}: LeftPanelContentProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const addComponentRef = useStore((state) => state.addComponentRef)
  const {
    isCjkGlyph,
    loading,
    previewGlyph,
    resultGlyphs,
    searchState,
    selectedComponent,
    setPreviewGlyphId,
    setSelectedComponent,
  } = useGlyphReferenceSearch({
    glyphs,
    glyphMap,
    selectedGlyph,
  })

  const activeComponentChar = selectedComponent ?? searchState.activeComponent
  const componentGlyph = useMemo(
    () => findGlyphByCharacter(glyphMap, activeComponentChar),
    [activeComponentChar, glyphMap]
  )
  const canInsertComponent = Boolean(
    selectedGlyph && componentGlyph && componentGlyph.id !== selectedGlyph.id
  )

  const handleInsertComponent = () => {
    if (!selectedGlyph || !componentGlyph) {
      return
    }
    const added = addComponentRef(selectedGlyph.id, componentGlyph.id)
    toast({
      title: added
        ? t('editor.componentInserted', { char: activeComponentChar })
        : t('editor.componentInsertFailed'),
      status: added ? 'success' : 'warning',
      duration: 2600,
      isClosable: true,
    })
  }

  return (
    <>
      <VStack align="stretch" spacing={3} mb={4}>
        <LeftPanelHeader
          hasSelectedGlyph={Boolean(selectedGlyph)}
          isCjkGlyph={isCjkGlyph}
          onBack={onBack}
        />

        {isCjkGlyph && selectedGlyph ? (
          <>
            <ComponentSearchSection
              components={searchState.components}
              loading={loading}
              selectedComponent={
                selectedComponent ?? searchState.activeComponent
              }
              onSelectComponent={setSelectedComponent}
            />
            {activeComponentChar ? (
              <Tooltip
                label={t('editor.componentNotInProject', {
                  char: activeComponentChar,
                })}
                isDisabled={canInsertComponent}
                hasArrow
              >
                <Button
                  size="sm"
                  variant="outline"
                  isDisabled={!canInsertComponent}
                  onClick={handleInsertComponent}
                >
                  {t('editor.insertAsComponent', {
                    char: activeComponentChar,
                  })}
                </Button>
              </Tooltip>
            ) : null}
          </>
        ) : null}

        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="field.muted" fontFamily="mono">
            {isCjkGlyph ? '含此部件的字符' : '相關字符'}{' '}
            {resultGlyphs.length.toLocaleString()}
          </Text>
        </HStack>
      </VStack>

      <Divider mb={4} borderColor="field.haze" opacity={0.55} />

      <Stack height="100%" minH={0} spacing={3}>
        <GlyphPreviewStrip
          glyphMap={glyphMap}
          previewGlyphId={previewGlyph?.id ?? null}
          resultGlyphs={resultGlyphs}
          onPreviewGlyphChange={setPreviewGlyphId}
        />

        <GlyphPreviewCard
          glyph={previewGlyph}
          glyphMap={glyphMap}
          onAddToEditor={onAddGlyphToEditor}
        />
      </Stack>

      {searchState.error ? (
        <Text mt={3} fontSize="sm" color="field.red.400">
          {searchState.error}
        </Text>
      ) : null}
    </>
  )
}

import { Box, Grid, GridItem, useBreakpointValue } from '@chakra-ui/react'
import { CanvasWorkspace } from 'src/features/editor/canvas/CanvasWorkspace'
import { GlyphInsightProvider } from 'src/features/editor/insight/GlyphInsightProvider'
import { LeftPanel } from 'src/features/editor/leftPanel/LeftPanel'
import { EditorRightPanel } from 'src/features/editor/rightPanel/EditorRightPanel'

export function EditorLayout() {
  const isDesktop = useBreakpointValue({ base: false, lg: true })

  return (
    <GlyphInsightProvider>
      <Grid
        templateColumns={isDesktop ? '300px minmax(0, 1fr) 320px' : '1fr'}
        templateRows={
          isDesktop ? '1fr' : 'minmax(280px, 36vh) minmax(420px, 1fr) auto'
        }
        templateAreas={
          isDesktop
            ? `"left canvas right"`
            : `"left"
             "canvas"
             "right"`
        }
        h="100vh"
        w="100vw"
        overflow="hidden"
        bg="field.ink"
      >
        <GridItem area="left" minW={0} minH={0}>
          <LeftPanel />
        </GridItem>
        <GridItem area="canvas" minW={0} minH={0}>
          <CanvasWorkspace />
        </GridItem>
        <GridItem area="right" minW={0} minH={0}>
          <EditorRightPanel />
        </GridItem>
      </Grid>
      {/* View transition landing zone — fixed at viewport center so the glyph card always flies to the middle */}
      <Box
        position="fixed"
        top="0px"
        left="50%"
        transform="translateX(-50%)"
        w="110vh"
        h="110vh"
        pointerEvents="none"
        aria-hidden="true"
        style={{ viewTransitionName: 'glyph-preview' }}
      />
    </GlyphInsightProvider>
  )
}

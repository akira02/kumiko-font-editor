/**
 * Project-level store actions: load, close, hydrate, and mark save state.
 */
import type { StateCreator } from 'zustand'
import type { FontData, GlobalState } from 'src/store/types'
import {
  clearProjectArchive,
  getProjectArchiveFirstMasterId,
  ingestProjectData,
} from 'src/lib/project/projectArchive'
import type {
  ProjectSourceFormat,
  ProjectRoundTripFormat,
} from 'src/lib/project/projectFormats'
import type { GlyphEditTimes } from 'src/lib/glyph/glyphEditTimes'
import { getProjectGlyphEditTimes } from 'src/lib/glyph/glyphEditTimes'
import { syncEditorTextFromGlyphIds } from 'src/store/editorLine'
import { syncFilteredGlyphList } from 'src/store/glyphSearch'
import {
  getGlyphLayer,
  getActiveLayerId,
  setGlyphActiveLayer,
} from 'src/store/glyphLayer'

type ImmerSet = Parameters<
  StateCreator<GlobalState, [['zustand/immer', never]], []>
>[0]

export const buildProjectActions = (
  set: ImmerSet,
  clearTemporal: () => void
) => ({
  loadProjectState: (
    id: string,
    title: string,
    fontData: FontData,
    projectMetadata: Record<string, unknown> | null = null,
    projectSourceFormat: ProjectSourceFormat | null = null,
    projectRoundTripFormat: ProjectRoundTripFormat | null = null
  ) =>
    set((state) => {
      const hotFontData = ingestProjectData(
        fontData,
        projectMetadata,
        projectSourceFormat,
        projectRoundTripFormat
      )
      state.projectId = id
      state.projectTitle = title
      state.fontData = hotFontData
      state.isDirty = false
      state.dirtyGlyphIds = []
      state.deletedGlyphIds = []
      state.hasLocalChanges = false
      state.localDirtyGlyphIds = []
      state.localDeletedGlyphIds = []
      state.glyphEditTimes = getProjectGlyphEditTimes(projectMetadata)
      state.editorGlyphIds = []
      state.editorText = ''
      state.editorTextCursorIndex = 0
      state.editorActiveGlyphIndex = 0
      state.workspaceView = 'overview'
      state.overviewGroupBy = 'script'
      state.overviewSectionId = 'all'
      state.overviewGridState = null
      state.overviewTopGlyphId = null
      const firstGlyph = Object.values(hotFontData.glyphs)[0]
      const firstMasterId = getProjectArchiveFirstMasterId()
      state.selectedLayerId =
        (firstMasterId && firstGlyph && getGlyphLayer(firstGlyph, firstMasterId)
          ? firstMasterId
          : null) ||
        (firstGlyph ? getActiveLayerId(firstGlyph) : null) ||
        null
      syncFilteredGlyphList(state)

      if (state.selectedGlyphId && !hotFontData.glyphs[state.selectedGlyphId]) {
        state.selectedGlyphId = Object.keys(hotFontData.glyphs)[0] ?? null
        state.selectedNodeIds = []
        state.selectedSegment = null
      } else if (!state.selectedGlyphId) {
        state.selectedGlyphId = Object.keys(hotFontData.glyphs)[0] ?? null
      }
      if (state.selectedGlyphId) {
        state.editorGlyphIds = [state.selectedGlyphId]
        syncEditorTextFromGlyphIds(state)
        state.editorTextCursorIndex = 1
        state.editorActiveGlyphIndex = 0
        setGlyphActiveLayer(
          state.fontData?.glyphs[state.selectedGlyphId],
          state.selectedLayerId
        )
      }
    }),

  hydratePersistedLocalChanges: (
    dirtyGlyphIds: string[],
    deletedGlyphIds: string[],
    glyphEditTimes: GlyphEditTimes = {}
  ) =>
    set((state) => {
      state.localDirtyGlyphIds = [...dirtyGlyphIds]
      state.localDeletedGlyphIds = [...deletedGlyphIds]
      state.glyphEditTimes = {
        ...state.glyphEditTimes,
        ...glyphEditTimes,
      }
      state.hasLocalChanges =
        dirtyGlyphIds.length > 0 || deletedGlyphIds.length > 0
    }),

  closeProjectState: () =>
    set((state) => {
      state.fontData = null
      state.projectId = null
      state.projectTitle = ''
      state.isDirty = false
      state.dirtyGlyphIds = []
      state.deletedGlyphIds = []
      state.hasLocalChanges = false
      state.localDirtyGlyphIds = []
      state.localDeletedGlyphIds = []
      state.glyphEditTimes = {}
      state.editorGlyphIds = []
      state.editorText = ''
      state.editorTextCursorIndex = 0
      state.editorActiveGlyphIndex = 0
      state.previewGlyphMetrics = null
      state.filteredGlyphList = []
      state.selectedNodeIds = []
      state.selectedSegment = null
      state.selectedLayerId = null
      state.workspaceView = 'overview'
      state.overviewGroupBy = 'script'
      state.overviewSectionId = 'all'
      state.overviewGridState = null
      state.overviewTopGlyphId = null
      clearProjectArchive()
      clearTemporal()
    }),

  // Pass the ids that were actually persisted so edits made during an async
  // save are not cleared; omit both to clear everything (full save/commit).
  markDraftSaved: (savedDirtyIds?: string[], savedDeletedIds?: string[]) =>
    set((state) => {
      if (!savedDirtyIds && !savedDeletedIds) {
        state.isDirty = false
        state.dirtyGlyphIds = []
        state.deletedGlyphIds = []
        return
      }
      const savedDirty = new Set(savedDirtyIds ?? [])
      const savedDeleted = new Set(savedDeletedIds ?? [])
      state.dirtyGlyphIds = state.dirtyGlyphIds.filter(
        (id) => !savedDirty.has(id)
      )
      state.deletedGlyphIds = state.deletedGlyphIds.filter(
        (id) => !savedDeleted.has(id)
      )
      state.isDirty =
        state.dirtyGlyphIds.length > 0 || state.deletedGlyphIds.length > 0
    }),

  markLocalSaved: () =>
    set((state) => {
      state.hasLocalChanges = false
      state.localDirtyGlyphIds = []
      state.localDeletedGlyphIds = []
    }),

  updateFontInfo: (update: {
    fontInfo: FontData['fontInfo']
    unitsPerEm?: number
  }) =>
    set((state) => {
      if (!state.fontData || !update.fontInfo) {
        return
      }

      state.fontData.fontInfo = update.fontInfo
      if (update.unitsPerEm !== undefined) {
        state.fontData.unitsPerEm = update.unitsPerEm
      }
      state.isDirty = true
      state.hasLocalChanges = true
    }),

  updateFontSettings: (fontDataUpdate: Partial<FontData>) =>
    set((state) => {
      if (!state.fontData) {
        return
      }

      state.fontData = {
        ...state.fontData,
        ...fontDataUpdate,
        glyphs: state.fontData.glyphs,
      }
      state.isDirty = true
      state.hasLocalChanges = true
    }),
})

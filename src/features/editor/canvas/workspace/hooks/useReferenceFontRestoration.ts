import { useEffect } from 'react'
import { loadReferenceFontRecord } from 'src/lib/referenceFont/referenceFontPersistence'
import {
  clearReferenceFont,
  loadReferenceFontFromBytes,
} from 'src/lib/referenceFont/referenceFontStore'

interface ReferenceFontRestorationOptions {
  projectId: string | null
  setReferenceFontChar: (char: string | null) => void
  setReferenceFontName: (name: string | null) => void
  setReferenceFontVisible: (visible: boolean) => void
}

export function useReferenceFontRestoration({
  projectId,
  setReferenceFontChar,
  setReferenceFontName,
  setReferenceFontVisible,
}: ReferenceFontRestorationOptions) {
  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      const record = projectId
        ? await loadReferenceFontRecord(projectId)
        : undefined
      if (cancelled) {
        return
      }
      if (record) {
        try {
          const name = loadReferenceFontFromBytes(
            record.fontBytes,
            record.fontName
          )
          setReferenceFontName(name)
          setReferenceFontVisible(true)
          setReferenceFontChar(null)
          return
        } catch {
          // Fall through to the cleared state below.
        }
      }
      clearReferenceFont()
      setReferenceFontName(null)
      setReferenceFontVisible(false)
      setReferenceFontChar(null)
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [
    projectId,
    setReferenceFontChar,
    setReferenceFontName,
    setReferenceFontVisible,
  ])
}

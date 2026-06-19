import { useQuery } from '@tanstack/react-query'
import {
  listSyncDirtyKumikoGlyphRecords,
  loadKumikoProjectRecord,
} from 'src/lib/project/kumikoProjectPersistence'

export const projectSyncDirtyStatusQueryKey = (projectId: string | null) => [
  'projectSyncDirtyStatus',
  projectId,
]

export const useProjectSyncDirtyStatus = (input: {
  projectId: string | null
  enabled: boolean
}) =>
  useQuery({
    queryKey: projectSyncDirtyStatusQueryKey(input.projectId),
    enabled: input.enabled && Boolean(input.projectId),
    staleTime: 5_000,
    queryFn: async () => {
      if (!input.projectId) {
        return false
      }
      const [project, dirtyGlyphs] = await Promise.all([
        loadKumikoProjectRecord(input.projectId),
        listSyncDirtyKumikoGlyphRecords(input.projectId),
      ])
      return Boolean(project?.syncDirty === 1 || dirtyGlyphs.length > 0)
    },
  })

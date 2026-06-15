import {
  deleteProject,
  getAllProjects,
  loadProject,
  loadProjectSummary,
  renameProject,
  saveProject,
  type ProjectDraft,
} from 'src/lib/project/persistence'
import { toProjectSummary } from 'src/lib/project/projectTypes'
import {
  deleteUfoProjectData,
  renameUfoProject,
} from 'src/lib/fontFormats/ufoPersistence'

export const listProjectSummaries = async () => {
  const projects = await getAllProjects()
  return projects.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const loadProjectDraft = loadProject

export const loadProjectDraftSummary = loadProjectSummary

export const saveProjectDraft = async (draft: ProjectDraft) => {
  await saveProject(draft)
  return toProjectSummary(draft)
}

export const renameKumikoProject = async (projectId: string, title: string) => {
  const summary = await renameProject(projectId, title)
  await renameUfoProject(projectId, title)
  return summary
}

export const deleteKumikoProject = async (projectId: string) => {
  await deleteProject(projectId)
  await deleteUfoProjectData(projectId)
}

export type {
  KumikoProjectDraft,
  KumikoProjectSummary,
} from 'src/lib/project/projectTypes'

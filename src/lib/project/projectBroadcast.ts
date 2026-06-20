const PROJECT_BROADCAST_CHANNEL = 'kumiko-project-updates'

const tabId =
  globalThis.crypto?.randomUUID?.() ??
  `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`

export interface ProjectDraftSavedMessage {
  type: 'project-draft-saved'
  originId: string
  projectId: string
  revision: number | null
  projectChanged: boolean
  uiStateChanged: boolean
  glyphIds: string[]
  deletedGlyphIds: string[]
  savedAt: number
}

export type ProjectBroadcastMessage = ProjectDraftSavedMessage

const canBroadcast = () => 'BroadcastChannel' in globalThis

export const getProjectBroadcastOriginId = () => tabId

export const publishProjectDraftSaved = (
  message: Omit<ProjectDraftSavedMessage, 'type' | 'originId' | 'savedAt'>
) => {
  if (!canBroadcast()) {
    return
  }

  const channel = new BroadcastChannel(PROJECT_BROADCAST_CHANNEL)
  channel.postMessage({
    ...message,
    type: 'project-draft-saved',
    originId: tabId,
    savedAt: Date.now(),
  } satisfies ProjectDraftSavedMessage)
  channel.close()
}

export const subscribeToProjectBroadcasts = (
  callback: (message: ProjectBroadcastMessage) => void
) => {
  if (!canBroadcast()) {
    return () => {}
  }

  const channel = new BroadcastChannel(PROJECT_BROADCAST_CHANNEL)
  channel.addEventListener(
    'message',
    (event: MessageEvent<ProjectBroadcastMessage>) => {
      const message = event.data
      if (!message || message.originId === tabId) {
        return
      }
      callback(message)
    }
  )

  return () => channel.close()
}

import { useEffect } from 'react'
import { renewProjectWriteLock } from 'src/lib/project/projectWriteLock'
import { useStore } from 'src/store'

const WRITE_LOCK_HEARTBEAT_MS = 60_000

export function useProjectWriteLockHeartbeat() {
  const projectId = useStore((state) => state.projectId)

  useEffect(() => {
    if (!projectId) {
      return
    }

    const renew = () => {
      void renewProjectWriteLock(projectId).catch((error) => {
        console.warn('Project write lock heartbeat failed.', error)
      })
    }

    renew()
    const intervalId = window.setInterval(renew, WRITE_LOCK_HEARTBEAT_MS)
    return () => window.clearInterval(intervalId)
  }, [projectId])
}

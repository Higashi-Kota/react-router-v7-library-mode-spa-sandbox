import { useCallback, useEffect, useState } from 'react'
import { useBlocker } from 'react-router'

export function useUnsavedChangesBlocker(shouldBlock: boolean) {
  const blocker = useBlocker(shouldBlock)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setDialogOpen(true)
    } else {
      setDialogOpen(false)
    }
  }, [blocker.state])

  const proceed = useCallback(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    setDialogOpen(false)
    blocker.proceed()
  }, [blocker])

  const cancel = useCallback(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    setDialogOpen(false)
    blocker.reset()
  }, [blocker])

  return {
    dialogOpen,
    proceed,
    cancel,
  }
}

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { AttachmentUploadManager } from '../core/attachment-upload-manager'
import type { Attachment } from '../domains/attachment'

export type UploadState =
  | { kind: 'idle' }
  | {
      kind: 'uploading'
      progress: number | null
      completedBytes: number
      totalBytes: number
    }
  | { kind: 'success'; attachments: Attachment[]; errors: string[] }
  | {
      kind: 'aborted'
      progress: number | null
      completedBytes: number
      totalBytes: number
    }
  | { kind: 'error'; message: string }

export type UploadItemStatus =
  | 'ready'
  | 'queued'
  | 'uploading'
  | 'aborted'
  | 'completed'
  | 'error'

export interface UploadQueueItem {
  id: string
  file: File
  status: UploadItemStatus
  progress: number
  uploadedBytes: number
  totalBytes: number
  attachment?: Attachment
  error?: string
}

interface ChunkOptions {
  enabled?: boolean
  chunkSize?: number
  maxRetries?: number
  retryDelayMs?: number
  requestTimeoutMs?: number
}

interface ResolvedChunkOptions {
  enabled: boolean
  chunkSize: number
  maxRetries: number
  retryDelayMs: number
  requestTimeoutMs: number
}

interface UseAttachmentUploaderOptions {
  taskId: string
  onSuccess?: (attachments: Attachment[], errors: string[]) => void
  chunk?: ChunkOptions
}

const DEFAULT_CHUNK_SIZE = 1024 * 1024 * 8 // 8MB
const DEFAULT_CHUNK_MAX_RETRIES = 5
const DEFAULT_CHUNK_RETRY_DELAY_MS = 750
const DEFAULT_CHUNK_REQUEST_TIMEOUT_MS = 0

function createUploadItem(file: File): UploadQueueItem {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    status: 'ready',
    progress: 0,
    uploadedBytes: 0,
    totalBytes: file.size,
  }
}

export function useAttachmentUploader({
  taskId,
  onSuccess,
  chunk,
}: UseAttachmentUploaderOptions) {
  const [state, setState] = useState<UploadState>({ kind: 'idle' })
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const queueRef = useRef<UploadQueueItem[]>([])
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null)
  const [pausedUploadId, setPausedUploadId] = useState<string | null>(null)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [isPending, startTransition] = useTransition()

  const managerRef = useRef<AttachmentUploadManager | null>(null)
  const pendingAssignmentRef = useRef<string[]>([])
  const uploadIdMapRef = useRef<Map<string, string>>(new Map())
  const lastProgressRef = useRef<{
    progress: number | null
    completedBytes: number
    totalBytes: number
  }>({
    progress: null,
    completedBytes: 0,
    totalBytes: 0,
  })

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  const chunkSettings = useMemo<ResolvedChunkOptions>(
    () => ({
      enabled: chunk?.enabled ?? true,
      chunkSize: chunk?.chunkSize ?? DEFAULT_CHUNK_SIZE,
      maxRetries: chunk?.maxRetries ?? DEFAULT_CHUNK_MAX_RETRIES,
      retryDelayMs: chunk?.retryDelayMs ?? DEFAULT_CHUNK_RETRY_DELAY_MS,
      requestTimeoutMs:
        chunk?.requestTimeoutMs ?? DEFAULT_CHUNK_REQUEST_TIMEOUT_MS,
    }),
    [
      chunk?.enabled,
      chunk?.chunkSize,
      chunk?.maxRetries,
      chunk?.retryDelayMs,
      chunk?.requestTimeoutMs,
    ],
  )

  useEffect(() => {
    const manager = new AttachmentUploadManager(
      {
        taskId,
        chunk: chunkSettings,
      },
      {
        onProgress: (info) => {
          lastProgressRef.current = info
          startTransition(() => {
            setState({
              kind: 'uploading',
              progress: info.progress,
              completedBytes: info.completedBytes,
              totalBytes: info.totalBytes,
            })
          })
        },
        onSuccess: (attachments, errors) => {
          startTransition(() => {
            setState({ kind: 'success', attachments, errors })
          })
          setIsBulkMode(false)
          setActiveUploadId(null)
          setPausedUploadId(null)
          onSuccess?.(attachments, errors)
        },
        onError: (message) => {
          startTransition(() => {
            setState({ kind: 'error', message })
          })
          setActiveUploadId(null)
        },
        onAbort: () => {
          startTransition(() => {
            setState({
              kind: 'aborted',
              progress: lastProgressRef.current.progress,
              completedBytes: lastProgressRef.current.completedBytes,
              totalBytes: lastProgressRef.current.totalBytes,
            })
          })
        },
        onFileQueued: ({ uploadId }) => {
          const nextId = pendingAssignmentRef.current.shift()
          if (!nextId) {
            return
          }
          uploadIdMapRef.current.set(uploadId, nextId)
        },
        onFileStart: ({ uploadId }) => {
          const itemId = uploadIdMapRef.current.get(uploadId)
          if (!itemId) {
            return
          }
          setQueue((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, status: 'uploading', progress: item.progress }
                : item,
            ),
          )
          setActiveUploadId(itemId)
          setPausedUploadId(null)
        },
        onFileProgress: ({
          uploadId,
          uploadedBytes,
          totalBytes,
          progress: _progress,
        }) => {
          const itemId = uploadIdMapRef.current.get(uploadId)
          if (!itemId) {
            return
          }
          setQueue((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    uploadedBytes,
                    totalBytes,
                    progress:
                      totalBytes === 0
                        ? item.progress
                        : Math.round((uploadedBytes / totalBytes) * 100),
                  }
                : item,
            ),
          )
        },
        onFileComplete: ({ uploadId, attachment }) => {
          const itemId = uploadIdMapRef.current.get(uploadId)
          if (!itemId) {
            return
          }
          setQueue((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: 'completed',
                    progress: 100,
                    uploadedBytes: item.totalBytes,
                    attachment: attachment ?? item.attachment,
                    error: undefined,
                  }
                : item,
            ),
          )
          setActiveUploadId(null)
          setPausedUploadId(null)
        },
        onFileError: ({ uploadId, message }) => {
          const itemId = uploadIdMapRef.current.get(uploadId)
          if (!itemId) {
            return
          }
          setQueue((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: 'error',
                    error: message,
                  }
                : item,
            ),
          )
          setActiveUploadId(null)
        },
        onFileAbort: ({ uploadId }) => {
          const itemId = uploadIdMapRef.current.get(uploadId)
          if (!itemId) {
            return
          }
          setQueue((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, status: 'aborted' } : item,
            ),
          )
          setActiveUploadId(null)
          setPausedUploadId(itemId)
        },
      },
    )

    managerRef.current = manager
    return () => {
      manager.reset()
      managerRef.current = null
      uploadIdMapRef.current.clear()
      pendingAssignmentRef.current = []
      setActiveUploadId(null)
      setPausedUploadId(null)
      setIsBulkMode(false)
    }
  }, [chunkSettings, onSuccess, taskId])

  const queueFiles = useCallback((files: File[]) => {
    if (!files.length) {
      return
    }
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => createUploadItem(file)),
    ])
  }, [])

  const startUpload = useCallback((ids: string[]) => {
    const manager = managerRef.current
    if (!manager) {
      return
    }
    const candidates = queueRef.current.filter(
      (item) =>
        ids.includes(item.id) &&
        (item.status === 'ready' ||
          item.status === 'error' ||
          item.status === 'aborted'),
    )
    if (candidates.length === 0) {
      return
    }

    pendingAssignmentRef.current = candidates.map((item) => item.id)
    uploadIdMapRef.current.clear()
    manager.reset()

    const totalBytes = candidates.reduce(
      (acc, item) => acc + item.totalBytes,
      0,
    )
    lastProgressRef.current = {
      progress: 0,
      completedBytes: 0,
      totalBytes,
    }

    setQueue((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              status: 'queued',
              progress: 0,
              uploadedBytes: 0,
              error: undefined,
            }
          : item,
      ),
    )
    setActiveUploadId(null)
    setPausedUploadId(null)
    setIsBulkMode(candidates.length > 1)
    setState({
      kind: 'uploading',
      progress: 0,
      completedBytes: 0,
      totalBytes,
    })

    manager.enqueueFiles(candidates.map((item) => item.file))
  }, [])

  const startAll = useCallback(() => {
    const eligible = queueRef.current
      .filter(
        (item) =>
          item.status === 'ready' ||
          item.status === 'error' ||
          item.status === 'aborted',
      )
      .map((item) => item.id)
    if (eligible.length === 0) {
      return
    }
    startUpload(eligible)
  }, [startUpload])

  const abort = useCallback(() => {
    managerRef.current?.abort()
  }, [])

  const resume = useCallback(() => {
    managerRef.current?.resume()
    setPausedUploadId(null)
    setState((prev) =>
      prev.kind === 'aborted'
        ? {
            kind: 'uploading',
            progress: prev.progress,
            completedBytes: prev.completedBytes,
            totalBytes: prev.totalBytes,
          }
        : prev,
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    const target = queueRef.current.find((item) => item.id === id)
    if (!target) {
      return
    }
    if (target.status === 'uploading' || target.status === 'queued') {
      return
    }
    setQueue((prev) => prev.filter((item) => item.id !== id))
    for (const [uploadId, mappedId] of uploadIdMapRef.current.entries()) {
      if (mappedId === id) {
        uploadIdMapRef.current.delete(uploadId)
      }
    }
  }, [])

  const clearCompleted = useCallback(() => {
    const completedIds = queueRef.current
      .filter((item) => item.status === 'completed')
      .map((item) => item.id)
    if (completedIds.length === 0) {
      return
    }
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'))
    for (const [uploadId, mappedId] of uploadIdMapRef.current.entries()) {
      if (completedIds.includes(mappedId)) {
        uploadIdMapRef.current.delete(uploadId)
      }
    }
  }, [])

  return {
    state,
    isPending,
    queue,
    queueFiles,
    startUpload,
    startAll,
    abort,
    resume,
    removeItem,
    clearCompleted,
    activeUploadId,
    pausedUploadId,
    isBulkMode,
  }
}

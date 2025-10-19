import { SmartQueue } from '../../../lib/smart-queue'
import type { Attachment } from '../domains/attachment'

type UploadProgress = {
  progress: number | null
  completedBytes: number
  totalBytes: number
}

type UploadError = {
  fileName: string
  message: string
}

interface FileQueuedPayload {
  uploadId: string
  file: File
}

interface FileStartPayload extends FileQueuedPayload {}

interface FileProgressPayload extends FileQueuedPayload {
  uploadedBytes: number
  totalBytes: number
  progress: number | null
}

interface FileCompletePayload extends FileQueuedPayload {
  attachment?: Attachment
}

interface FileErrorPayload extends FileQueuedPayload {
  message: string
}

interface FileAbortPayload extends FileQueuedPayload {}

interface UploadJob {
  file: File
  offset: number
  uploadedBytes: number
  chunkNumber: number
  chunkCount: number
  uploadId: string
}

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

interface UploadCallbacks {
  onProgress?: (info: UploadProgress) => void
  onSuccess?: (attachments: Attachment[], errors: string[]) => void
  onError?: (message: string) => void
  onAbort?: () => void
  onFileQueued?: (payload: FileQueuedPayload) => void
  onFileStart?: (payload: FileStartPayload) => void
  onFileProgress?: (payload: FileProgressPayload) => void
  onFileComplete?: (payload: FileCompletePayload) => void
  onFileError?: (payload: FileErrorPayload) => void
  onFileAbort?: (payload: FileAbortPayload) => void
}

interface ChunkSettings {
  enabled: boolean
  chunkSize: number
  maxRetries: number
  retryDelayMs: number
  requestTimeoutMs: number
}

interface UploadConfig {
  taskId: string
  chunk: ChunkSettings
}

interface ChunkResponse {
  data: {
    uploadId: string
    chunkNumber: number
    nextChunkNumber: number
    completed: boolean
    alreadyProcessed: boolean
    receivedBytes: number
    attachment?: Attachment
  }
}

type ChunkStatusResponse =
  | {
      data: {
        status: 'in-progress'
        uploadId: string
        chunkCount: number
        nextChunkNumber: number
        receivedBytes: number
        filename: string
      }
    }
  | {
      data: {
        status: 'completed'
        uploadId: string
        receivedBytes: number
        attachment: Attachment
      }
    }

interface FormUploadResponse {
  data: {
    attachments: Attachment[]
    errors: Array<{ message: string }>
  }
}

export class AttachmentUploadManager {
  private readonly config: UploadConfig
  private readonly callbacks: UploadCallbacks
  private readonly queue = new SmartQueue<UploadJob>()

  private resumeJob: UploadJob | null = null
  private xhr: XMLHttpRequest | null = null
  private totalBytes = 0
  private completedBytes = 0
  private attachments: Attachment[] = []
  private errors: UploadError[] = []
  private processing = false
  private aborted = false
  private currentJob: UploadJob | null = null

  constructor(config: UploadConfig, callbacks: UploadCallbacks) {
    this.config = config
    this.callbacks = callbacks
  }

  enqueueFiles(files: File[]): void {
    if (!files.length) {
      return
    }

    if (this.queue.isEmpty() && !this.processing && !this.resumeJob) {
      this.totalBytes = 0
      this.completedBytes = 0
      this.attachments = []
      this.errors = []
      this.aborted = false
    }

    files.forEach((file) => {
      const job: UploadJob = {
        file,
        offset: 0,
        uploadedBytes: 0,
        chunkNumber: 1,
        chunkCount: this.calculateChunkCount(file),
        uploadId: `${this.config.taskId}-${generateId()}`,
      }
      this.totalBytes += file.size
      this.queue.enqueue(job)
      this.callbacks.onFileQueued?.({
        uploadId: job.uploadId,
        file: job.file,
      })
    })

    this.processQueue().catch((error) => {
      this.callbacks.onError?.(
        error instanceof Error ? error.message : String(error),
      )
    })
  }

  abort(): void {
    this.aborted = true
    this.xhr?.abort()
    this.callbacks.onAbort?.()
  }

  resume(): void {
    if (!this.resumeJob) {
      return
    }
    this.aborted = false
    this.processQueue().catch((error) => {
      this.callbacks.onError?.(
        error instanceof Error ? error.message : String(error),
      )
    })
  }

  reset(): void {
    this.queue.clear()
    this.resumeJob = null
    this.xhr?.abort()
    this.xhr = null
    this.totalBytes = 0
    this.completedBytes = 0
    this.attachments = []
    this.errors = []
    this.processing = false
    this.aborted = false
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.aborted) {
      return
    }

    const job = this.resumeJob ?? this.queue.dequeue()
    this.resumeJob = null
    if (!job) {
      if (this.completedBytes === this.totalBytes && !this.processing) {
        this.callbacks.onSuccess?.(
          this.attachments,
          this.errors.map((error) =>
            error.fileName
              ? `${error.fileName}: ${error.message}`
              : error.message,
          ),
        )
      }
      return
    }

    this.processing = true
    this.currentJob = job
    try {
      this.callbacks.onFileStart?.({
        uploadId: job.uploadId,
        file: job.file,
      })
      let attachment: Attachment | undefined
      if (this.shouldUseChunks(job.file)) {
        attachment = await this.uploadWithChunks(job)
      } else {
        const created = await this.uploadAsForm(job.file)
        this.completedBytes += job.file.size
        this.reportProgress(null)
        attachment = created.at(-1)
      }
      this.callbacks.onFileComplete?.({
        uploadId: job.uploadId,
        file: job.file,
        attachment,
      })
    } catch (error) {
      if (error instanceof AbortError) {
        this.callbacks.onFileAbort?.({
          uploadId: job.uploadId,
          file: job.file,
        })
        return
      }
      this.errors.push({
        fileName: job.file.name,
        message: error instanceof Error ? error.message : 'Upload failed',
      })
      this.callbacks.onFileError?.({
        uploadId: job.uploadId,
        file: job.file,
        message: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      this.processing = false
      this.currentJob = null
      if (!this.aborted) {
        await this.processQueue()
      }
    }
  }

  private calculateChunkCount(file: File): number {
    if (!this.config.chunk.enabled) {
      return 1
    }
    return Math.max(1, Math.ceil(file.size / this.config.chunk.chunkSize))
  }

  private shouldUseChunks(file: File): boolean {
    if (!this.config.chunk.enabled) {
      return false
    }
    return file.size > this.config.chunk.chunkSize
  }

  private reportProgress(partial: number | null) {
    const overall =
      partial ??
      (this.totalBytes > 0
        ? Math.round((this.completedBytes / this.totalBytes) * 100)
        : 0)
    this.callbacks.onProgress?.({
      progress: overall,
      completedBytes: this.completedBytes,
      totalBytes: this.totalBytes,
    })
  }

  private async uploadAsForm(file: File) {
    const formData = new FormData()
    formData.append('files', file)

    const { responseText } = await this.sendRequest(
      `/api/tasks/${this.config.taskId}/attachments`,
      formData,
    )
    const payload = JSON.parse(responseText) as FormUploadResponse
    const attachments = payload.data.attachments ?? []
    this.attachments = [...this.attachments, ...attachments]
    if (this.currentJob) {
      this.callbacks.onFileProgress?.({
        uploadId: this.currentJob.uploadId,
        file,
        uploadedBytes: file.size,
        totalBytes: file.size,
        progress: 100,
      })
    }
    return attachments
  }

  private async uploadWithChunks(job: UploadJob) {
    const { file } = job
    let chunkNumber = job.chunkNumber
    const chunkCount = job.chunkCount
    let uploadedBytes = job.uploadedBytes
    let finishedAttachment: Attachment | undefined

    while (chunkNumber <= chunkCount) {
      if (this.aborted) {
        this.resumeJob = {
          ...job,
          chunkNumber,
          uploadedBytes,
        }
        throw new AbortError()
      }

      const start = (chunkNumber - 1) * this.config.chunk.chunkSize
      const end = Math.min(start + this.config.chunk.chunkSize, file.size)
      const chunkBlob = file.slice(start, end)

      const result = await this.uploadChunkWithRetry({
        job,
        chunkBlob,
        chunkNumber,
        chunkCount,
        maxRetries: this.config.chunk.maxRetries,
        retryDelayMs: this.config.chunk.retryDelayMs,
        currentUploadedBytes: uploadedBytes,
      })

      uploadedBytes = Math.max(
        uploadedBytes,
        Math.min(result.receivedBytes, file.size),
      )

      this.callbacks.onFileProgress?.({
        uploadId: job.uploadId,
        file: job.file,
        uploadedBytes,
        totalBytes: file.size,
        progress: Math.round(
          ((this.completedBytes + uploadedBytes) / this.totalBytes) * 100,
        ),
      })

      this.reportProgress(
        Math.round(
          ((this.completedBytes + uploadedBytes) / this.totalBytes) * 100,
        ),
      )

      if (result.completed) {
        if (result.attachment) {
          this.attachments = [...this.attachments, result.attachment]
          finishedAttachment = result.attachment
        }
        uploadedBytes = file.size
        chunkNumber = chunkCount + 1
        break
      }

      chunkNumber = result.nextChunkNumber
    }

    job.chunkNumber = chunkCount + 1
    job.uploadedBytes = uploadedBytes
    this.completedBytes += uploadedBytes
    this.reportProgress(null)
    return finishedAttachment
  }

  private async uploadChunkWithRetry(options: {
    job: UploadJob
    chunkBlob: Blob
    chunkNumber: number
    chunkCount: number
    maxRetries: number
    retryDelayMs: number
    currentUploadedBytes: number
  }) {
    const {
      job,
      chunkBlob,
      chunkNumber,
      chunkCount,
      maxRetries,
      retryDelayMs,
      currentUploadedBytes,
    } = options
    let attempt = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const formData = new FormData()
      formData.append('uploadId', job.uploadId)
      formData.append('chunkNumber', String(chunkNumber))
      formData.append('chunkCount', String(chunkCount))
      formData.append('filename', job.file.name)
      formData.append('mimetype', job.file.type)
      formData.append('encoding', '7bit')
      formData.append('chunk', chunkBlob, `${job.file.name}.part${chunkNumber}`)

      try {
        const response = await this.sendRequest(
          `/api/tasks/${this.config.taskId}/attachments/chunk`,
          formData,
        )
        const payload = JSON.parse(response.responseText) as ChunkResponse
        return {
          completed: payload.data.completed,
          nextChunkNumber: payload.data.nextChunkNumber,
          receivedBytes: payload.data.receivedBytes,
          attachment: payload.data.attachment,
        }
      } catch (error) {
        if (error instanceof AbortError) {
          this.resumeJob = {
            ...job,
            chunkNumber,
            uploadedBytes: currentUploadedBytes,
          }
          throw error
        }

        let shouldRetry = false

        if (error instanceof HttpError) {
          if (error.status === 409 || error.status === 404) {
            const sync = await this.syncChunkState(job.uploadId)
            if (sync?.status === 'completed') {
              return {
                completed: true,
                nextChunkNumber: chunkCount + 1,
                receivedBytes: sync.receivedBytes,
                attachment: sync.attachment,
              }
            }
            if (sync?.status === 'in-progress') {
              return {
                completed: false,
                nextChunkNumber: sync.nextChunkNumber,
                receivedBytes: sync.receivedBytes,
              }
            }
            shouldRetry = true
          } else if (error.status === 429 || error.status >= 500) {
            shouldRetry = true
          } else {
            throw error
          }
        } else if (error instanceof NetworkError) {
          shouldRetry = true
        } else {
          throw error
        }

        attempt += 1
        if (!shouldRetry || attempt > maxRetries) {
          throw error
        }

        await sleep(retryDelayMs * attempt)
      }
    }
  }

  private async syncChunkState(uploadId: string) {
    try {
      const response = await fetch(
        `/api/tasks/${this.config.taskId}/attachments/chunk/${uploadId}`,
      )
      if (!response.ok) {
        return null
      }
      const payload = (await response.json()) as ChunkStatusResponse
      if (payload.data.status === 'completed') {
        return {
          status: 'completed' as const,
          receivedBytes: payload.data.receivedBytes,
          attachment: payload.data.attachment,
        }
      }
      return {
        status: 'in-progress' as const,
        receivedBytes: payload.data.receivedBytes,
        nextChunkNumber: payload.data.nextChunkNumber,
        chunkCount: payload.data.chunkCount,
      }
    } catch {
      return null
    }
  }

  private sendRequest(endpoint: string, formData: FormData) {
    return new Promise<{ status: number; responseText: string }>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest()
        this.xhr = xhr

        xhr.upload.onprogress = (event) => {
          if (this.totalBytes === 0) {
            return
          }
          if (event.lengthComputable) {
            const base = this.completedBytes
            const progress = Math.round(
              ((base + event.loaded) / this.totalBytes) * 100,
            )
            this.callbacks.onProgress?.({
              progress,
              completedBytes: base + event.loaded,
              totalBytes: this.totalBytes,
            })
          } else {
            this.callbacks.onProgress?.({
              progress: null,
              completedBytes: this.completedBytes,
              totalBytes: this.totalBytes,
            })
          }
        }

        xhr.onerror = () => {
          reject(new NetworkError('ネットワークエラーが発生しました'))
        }

        xhr.onabort = () => {
          reject(new AbortError())
        }

        xhr.ontimeout = () => {
          reject(new NetworkError('アップロードがタイムアウトしました'))
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ status: xhr.status, responseText: xhr.responseText })
          } else {
            reject(
              new HttpError(
                xhr.status,
                `アップロードに失敗しました (status: ${xhr.status})`,
              ),
            )
          }
        }

        xhr.open('POST', endpoint)
        xhr.timeout = this.config.chunk.requestTimeoutMs
        xhr.send(formData)
      },
    ).finally(() => {
      this.xhr = null
    })
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

class NetworkError extends Error {}

class AbortError extends Error {
  constructor() {
    super('upload_aborted')
  }
}

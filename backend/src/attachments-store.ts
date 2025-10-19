import { createWriteStream } from 'node:fs'
import { mkdir, stat, truncate, unlink } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { customAlphabet } from 'nanoid'
import { getTask } from './store.js'

interface AttachmentMeta {
  id: string
  taskId: string
  filename: string
  storedFilename: string
  mimetype: string
  encoding: string
  size: number
  uploadedAt: string
}

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)
const attachments = new Map<string, AttachmentMeta[]>()

interface ChunkSession {
  taskId: string
  filename: string
  storedFilename: string
  mimetype: string
  encoding: string
  chunkCount: number
  nextChunkNumber: number
  size: number
  processedChunks: Map<number, number>
  createdAt: number
  updatedAt: number
}

const chunkSessions = new Map<string, ChunkSession>()
const completedUploads = new Map<
  string,
  { attachment: AttachmentMeta; taskId: string; expiresAt: number }
>()

const CHUNK_SESSION_TTL_MS = 1000 * 60 * 30 // 30 minutes
const COMPLETED_UPLOAD_TTL_MS = 1000 * 60 * 10 // 10 minutes

const uploadsDir = path.join(
  path.dirname(fileURLToPath(new URL(import.meta.url))),
  '../uploads',
)

export async function ensureUploadsDir() {
  await mkdir(uploadsDir, { recursive: true })
}

export function listAttachments(taskId: string): AttachmentMeta[] {
  return attachments.get(taskId)?.map((att) => ({ ...att })) ?? []
}

export async function deleteAttachment(taskId: string, attachmentId: string) {
  const list = attachments.get(taskId)
  if (!list) {
    return false
  }
  const index = list.findIndex((item) => item.id === attachmentId)
  if (index === -1) {
    return false
  }
  const [removed] = list.splice(index, 1)
  if (!removed) {
    return false
  }
  if (list.length === 0) {
    attachments.delete(taskId)
  }
  await unlink(path.join(uploadsDir, removed.storedFilename)).catch(() => {})
  return true
}

function generateStoredFilename(taskId: string, filename: string) {
  const safeName = sanitizeFilename(filename)
  return `${taskId}_${nanoid()}_${Date.now()}_${safeName}`
}

export interface UploadedFilePart {
  filename: string
  mimetype: string
  encoding: string
  stream: NodeJS.ReadableStream
}

export async function saveAttachment(
  taskId: string,
  file: UploadedFilePart,
): Promise<AttachmentMeta> {
  if (!getTask(taskId)) {
    throw new Error('Task not found')
  }

  const storedFilename = generateStoredFilename(taskId, file.filename)
  const destination = path.join(uploadsDir, storedFilename)

  await ensureUploadsDir()

  let size = 0
  file.stream.on('data', (chunk) => {
    size += chunk.length
  })
  const writeStream = createWriteStream(destination)
  await pipeline(file.stream, writeStream)

  return registerAttachmentFromFile({
    taskId,
    filename: file.filename,
    storedFilename,
    mimetype: file.mimetype,
    encoding: file.encoding,
    size,
  })
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '_') || 'file'
}

interface RegisterAttachmentParams {
  taskId: string
  filename: string
  storedFilename: string
  mimetype: string
  encoding: string
  size: number
}

function toAttachmentMeta(
  params: RegisterAttachmentParams & { id?: string },
): AttachmentMeta {
  return {
    id: params.id ?? nanoid(),
    taskId: params.taskId,
    filename: params.filename,
    storedFilename: params.storedFilename,
    mimetype: params.mimetype,
    encoding: params.encoding,
    size: params.size,
    uploadedAt: new Date().toISOString(),
  }
}

function storeAttachment(meta: AttachmentMeta) {
  const list = attachments.get(meta.taskId)
  if (list) {
    list.push(meta)
  } else {
    attachments.set(meta.taskId, [meta])
  }
  return meta
}

function registerAttachmentFromFile(params: RegisterAttachmentParams) {
  const meta = toAttachmentMeta(params)
  storeAttachment(meta)
  return meta
}

function cleanupChunkArtifacts(uploadId: string, session?: ChunkSession) {
  if (session) {
    const destination = path.join(uploadsDir, session.storedFilename)
    unlink(destination).catch(() => {})
  }
  chunkSessions.delete(uploadId)
}

function pruneStaleSessions(now = Date.now()) {
  for (const [uploadId, session] of chunkSessions) {
    if (now - session.updatedAt > CHUNK_SESSION_TTL_MS) {
      cleanupChunkArtifacts(uploadId, session)
    }
  }
  for (const [uploadId, completed] of completedUploads) {
    if (completed.expiresAt <= now) {
      completedUploads.delete(uploadId)
    }
  }
}

export async function appendChunk(options: {
  taskId: string
  uploadId: string
  chunkNumber: number
  chunkCount: number
  filename: string
  mimetype: string
  encoding: string
  stream: NodeJS.ReadableStream
}) {
  const {
    taskId,
    uploadId,
    chunkNumber,
    chunkCount,
    filename,
    mimetype,
    encoding,
    stream,
  } = options

  if (!getTask(taskId)) {
    throw new Error('Task not found')
  }

  const existing = chunkSessions.get(uploadId)
  const now = Date.now()
  pruneStaleSessions(now)
  let session: ChunkSession
  if (!existing) {
    const completed = completedUploads.get(uploadId)
    if (completed) {
      if (completed.taskId !== taskId) {
        throw new Error('UploadTaskMismatch')
      }
      return {
        completed: true,
        alreadyProcessed: true,
        receivedBytes: completed.attachment.size,
        nextChunkNumber: chunkCount + 1,
        attachment: completed.attachment,
      }
    }
    const storedFilename = generateStoredFilename(taskId, filename)
    session = {
      taskId,
      filename,
      storedFilename,
      mimetype,
      encoding,
      chunkCount,
      nextChunkNumber: 1,
      size: 0,
      processedChunks: new Map(),
      createdAt: now,
      updatedAt: now,
    }
    chunkSessions.set(uploadId, session)
  } else {
    session = existing
    if (session.taskId !== taskId) {
      throw new Error('UploadTaskMismatch')
    }
    if (chunkCount !== session.chunkCount) {
      throw new Error('ChunkCountMismatch')
    }
    session.updatedAt = now
  }

  if (chunkNumber !== session.nextChunkNumber) {
    if (chunkNumber < session.nextChunkNumber) {
      return {
        completed: false,
        alreadyProcessed: true,
        receivedBytes: session.size,
        nextChunkNumber: session.nextChunkNumber,
      }
    }
    throw new Error('UnexpectedChunk')
  }

  await ensureUploadsDir()
  const destination = path.join(uploadsDir, session.storedFilename)

  if (session.size > 0) {
    const stats = await stat(destination).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          return null
        }
        throw error
      },
    )
    if (!stats) {
      cleanupChunkArtifacts(uploadId, session)
      throw new Error('ChunkFileMissing')
    }
    if (stats.size > session.size) {
      await truncate(destination, session.size)
    } else if (stats.size < session.size) {
      cleanupChunkArtifacts(uploadId, session)
      throw new Error('ChunkFileCorrupted')
    }
  }

  const writeStream = createWriteStream(destination, { flags: 'a' })

  // Stream the chunk directly to file
  let chunkSize = 0
  stream.on('data', (chunk: Buffer) => {
    chunkSize += chunk.length
  })

  await pipeline(stream, writeStream)

  session.size += chunkSize
  session.processedChunks.set(chunkNumber, chunkSize)
  session.nextChunkNumber += 1
  session.updatedAt = Date.now()

  const isCompleted = chunkNumber >= session.chunkCount

  if (isCompleted) {
    chunkSessions.delete(uploadId)
    const meta = registerAttachmentFromFile({
      taskId: session.taskId,
      filename: session.filename,
      storedFilename: session.storedFilename,
      mimetype: session.mimetype,
      encoding: session.encoding,
      size: session.size,
    })
    session.updatedAt = now
    completedUploads.set(uploadId, {
      attachment: meta,
      taskId: session.taskId,
      expiresAt: now + COMPLETED_UPLOAD_TTL_MS,
    })
    return {
      completed: true,
      alreadyProcessed: false,
      receivedBytes: session.size,
      nextChunkNumber: session.chunkCount + 1,
      attachment: meta,
    }
  }

  return {
    completed: false,
    alreadyProcessed: false,
    receivedBytes: session.size,
    nextChunkNumber: session.nextChunkNumber,
  }
}

export function getChunkUploadState(uploadId: string) {
  pruneStaleSessions()
  const session = chunkSessions.get(uploadId)
  if (session) {
    return {
      status: 'in-progress' as const,
      taskId: session.taskId,
      uploadId,
      chunkCount: session.chunkCount,
      nextChunkNumber: session.nextChunkNumber,
      receivedBytes: session.size,
      filename: session.filename,
    }
  }
  const completed = completedUploads.get(uploadId)
  if (completed) {
    return {
      status: 'completed' as const,
      taskId: completed.taskId,
      uploadId,
      receivedBytes: completed.attachment.size,
      attachment: completed.attachment,
    }
  }
  return null
}

export function toPublicAttachment(meta: AttachmentMeta) {
  return {
    id: meta.id,
    taskId: meta.taskId,
    filename: meta.filename,
    mimetype: meta.mimetype,
    encoding: meta.encoding,
    size: meta.size,
    uploadedAt: meta.uploadedAt,
  }
}

import Busboy from 'busboy'
import type { Request } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import {
  appendChunk,
  deleteAttachment,
  getChunkUploadState,
  listAttachments,
  saveAttachment,
  toPublicAttachment,
  type UploadedFilePart,
} from '../attachments-store.js'
import { getTask } from '../store.js'

const router = Router()

type AppendChunkResult = Awaited<ReturnType<typeof appendChunk>>

const paramsSchema = z.object({
  taskId: z.string().min(1),
})

const chunkFieldsSchema = z.object({
  uploadId: z.string().min(1),
  chunkNumber: z.coerce.number().int().min(1),
  chunkCount: z.coerce.number().int().min(1),
  filename: z.string().min(1),
  mimetype: z.string().optional(),
  encoding: z.string().optional(),
})

const chunkStatusParamsSchema = z.object({
  taskId: z.string().min(1),
  uploadId: z.string().min(1),
})

const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024 * 1024 // 4GB

router.get('/api/tasks/:taskId/attachments', (req, res) => {
  const parsed = paramsSchema.safeParse(req.params)
  if (!parsed.success) {
    res.status(400).json({ error: 'InvalidTaskId' })
    return
  }
  const { taskId } = parsed.data
  if (!getTask(taskId)) {
    res.status(404).json({ error: 'TaskNotFound' })
    return
  }
  const attachments = listAttachments(taskId).map(toPublicAttachment)
  res.json({ data: attachments })
})

router.post('/api/tasks/:taskId/attachments', async (req, res, next) => {
  try {
    const parsed = paramsSchema.safeParse(req.params)
    if (!parsed.success) {
      res.status(400).json({ error: 'InvalidTaskId' })
      return
    }
    const { taskId } = parsed.data
    if (!getTask(taskId)) {
      res.status(404).json({ error: 'TaskNotFound' })
      return
    }

    const result = await processAttachmentUpload(req, taskId)
    if (!result.processed) {
      res.status(400).json({ error: 'FileRequired' })
      return
    }
    res.status(201).json({
      data: {
        attachments: result.attachments.map(toPublicAttachment),
        errors: result.errors.map((message) => ({ message })),
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/api/tasks/:taskId/attachments/chunk', (req, res, next) => {
  const parsedParams = paramsSchema.safeParse(req.params)
  if (!parsedParams.success) {
    res.status(400).json({ error: 'InvalidTaskId' })
    return
  }
  const { taskId } = parsedParams.data

  const busboy = createBusboy(req)
  const fields: Record<string, string> = {}
  let chunkHandled = false
  let chunkPromise: Promise<AppendChunkResult> | null = null
  let finished = false
  let parsedChunkMetadata: z.infer<typeof chunkFieldsSchema> | null = null

  busboy.on('field', (name, value) => {
    fields[name] = value
  })

  busboy.on('file', (_fieldName, stream, info) => {
    if (chunkHandled) {
      stream.resume()
      return
    }
    chunkHandled = true
    const part: UploadedFilePart = {
      filename: info.filename ?? 'file',
      mimetype: info.mimeType ?? 'application/octet-stream',
      encoding: info.encoding ?? '7bit',
      stream,
    }

    const parsedFields = chunkFieldsSchema.safeParse(fields)
    if (!parsedFields.success) {
      stream.resume()
      chunkPromise = Promise.reject(
        new ChunkValidationError('InvalidChunkMetadata'),
      )
      return
    }
    parsedChunkMetadata = parsedFields.data

    chunkPromise = appendChunk({
      taskId,
      uploadId: parsedFields.data.uploadId,
      chunkNumber: parsedFields.data.chunkNumber,
      chunkCount: parsedFields.data.chunkCount,
      filename: parsedFields.data.filename,
      mimetype: parsedFields.data.mimetype ?? part.mimetype,
      encoding: parsedFields.data.encoding ?? part.encoding,
      stream: part.stream,
    })
  })

  busboy.on('error', (error) => {
    finished = true
    next(error)
  })

  busboy.on('finish', async () => {
    if (finished) {
      return
    }
    finished = true
    if (!chunkHandled || !chunkPromise) {
      res.status(400).json({ error: 'FileRequired' })
      return
    }
    try {
      const result = await chunkPromise
      if (!parsedChunkMetadata) {
        res.status(500).json({ error: 'ChunkMetadataMissing' })
        return
      }
      const alreadyProcessed =
        'alreadyProcessed' in result ? result.alreadyProcessed : false
      const attachmentMeta =
        'attachment' in result && result.attachment ? result.attachment : null
      const receivedBytes =
        'receivedBytes' in result
          ? result.receivedBytes
          : (attachmentMeta?.size ?? 0)
      const payload = {
        uploadId: parsedChunkMetadata.uploadId,
        chunkNumber: parsedChunkMetadata.chunkNumber,
        nextChunkNumber:
          'nextChunkNumber' in result
            ? result.nextChunkNumber
            : parsedChunkMetadata.chunkNumber + 1,
        completed: result.completed,
        alreadyProcessed,
        receivedBytes,
        attachment: attachmentMeta
          ? toPublicAttachment(attachmentMeta)
          : undefined,
      }
      res.json({ data: payload })
    } catch (error) {
      if (error instanceof ChunkValidationError) {
        res.status(400).json({ error: error.message })
        return
      }
      if (error instanceof Error) {
        if (error.message === 'Task not found') {
          res.status(404).json({ error: error.message })
          return
        }
        if (
          error.message === 'UnexpectedChunk' ||
          error.message === 'ChunkCountMismatch' ||
          error.message === 'UploadTaskMismatch' ||
          error.message === 'ChunkFileMissing' ||
          error.message === 'ChunkFileCorrupted'
        ) {
          res.status(409).json({ error: error.message })
          return
        }
      }
      next(error)
    }
  })

  req.pipe(busboy)
})

router.get('/api/tasks/:taskId/attachments/chunk/:uploadId', (req, res) => {
  const params = chunkStatusParamsSchema.safeParse(req.params)
  if (!params.success) {
    res.status(400).json({ error: 'InvalidParams' })
    return
  }
  const { taskId, uploadId } = params.data

  const state = getChunkUploadState(uploadId)
  if (!state || state.taskId !== taskId) {
    res.status(404).json({ error: 'ChunkSessionNotFound' })
    return
  }
  if (state.status === 'completed') {
    res.json({
      data: {
        status: state.status,
        uploadId,
        receivedBytes: state.receivedBytes,
        attachment: toPublicAttachment(state.attachment),
      },
    })
    return
  }
  res.json({
    data: {
      status: state.status,
      uploadId,
      chunkCount: state.chunkCount,
      nextChunkNumber: state.nextChunkNumber,
      receivedBytes: state.receivedBytes,
      filename: state.filename,
    },
  })
})

router.delete(
  '/api/tasks/:taskId/attachments/:attachmentId',
  async (req, res, next) => {
    try {
      const params = z
        .object({ taskId: z.string().min(1), attachmentId: z.string().min(1) })
        .safeParse(req.params)
      if (!params.success) {
        res.status(400).json({ error: 'InvalidParams' })
        return
      }
      const { taskId, attachmentId } = params.data
      if (!getTask(taskId)) {
        res.status(404).json({ error: 'TaskNotFound' })
        return
      }
      const removed = await deleteAttachment(taskId, attachmentId)
      if (!removed) {
        res.status(404).json({ error: 'AttachmentNotFound' })
        return
      }
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
)

function processAttachmentUpload(req: Request, taskId: string) {
  return new Promise<{
    processed: boolean
    attachments: ReturnType<typeof listAttachments>
    errors: string[]
  }>((resolve, reject) => {
    const busboy = createBusboy(req)
    const attachments: ReturnType<typeof listAttachments> = []
    const errors: string[] = []
    const fileTasks: Array<Promise<void>> = []
    let processed = false
    let finished = false

    busboy.on('file', (_fieldname, stream, info) => {
      processed = true
      const part: UploadedFilePart = {
        filename: info.filename ?? 'file',
        mimetype: info.mimeType ?? 'application/octet-stream',
        encoding: info.encoding ?? '7bit',
        stream,
      }
      const promise = saveAttachment(taskId, part)
        .then((saved: Awaited<ReturnType<typeof saveAttachment>>) => {
          attachments.push(saved)
        })
        .catch((error: unknown) => {
          errors.push(
            error instanceof Error
              ? `${part.filename}: ${error.message}`
              : `${part.filename}: UploadFailed`,
          )
        })
      fileTasks.push(promise)
    })

    busboy.on('error', (error) => {
      finished = true
      reject(error)
    })

    busboy.on('finish', async () => {
      if (finished) {
        return
      }
      finished = true
      try {
        await Promise.all(fileTasks)
        resolve({ processed, attachments, errors })
      } catch (error) {
        reject(error)
      }
    })

    req.pipe(busboy)
  })
}

function createBusboy(req: Request) {
  return Busboy({
    headers: req.headers,
    limits: {
      fileSize: MAX_UPLOAD_SIZE_BYTES,
      files: 20,
    },
  })
}

class ChunkValidationError extends Error {}

export { router as attachmentsRouter }

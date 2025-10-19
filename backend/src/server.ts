import http from 'node:http'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { ensureUploadsDir } from './attachments-store.js'
import { attachmentsRouter } from './routes/attachments.js'
import { commentsRouter } from './routes/comments.js'
import { tasksRouter } from './routes/tasks.js'

export async function buildServer() {
  await ensureUploadsDir()

  const app = express()
  app.disable('x-powered-by')

  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )

  app.use(express.json({ limit: '32mb' }))
  app.use(express.urlencoded({ extended: true, limit: '32mb' }))

  app.use(tasksRouter)
  app.use(attachmentsRouter)
  app.use(commentsRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: 'NotFound' })
  })

  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: 'InvalidJSON' })
        return
      }
      if (error instanceof Error && 'status' in error) {
        const status = Number((error as { status: number }).status)
        res.status(status || 500).json({ error: error.message })
        return
      }
      if (error instanceof Error) {
        console.error('[server] unexpected error', error)
        res.status(500).json({ error: 'InternalServerError' })
        return
      }
      res.status(500).json({ error: 'InternalServerError' })
    },
  )

  return app
}

async function start() {
  const port = Number.parseInt(process.env.PORT ?? '4000', 10)
  const host = process.env.HOST ?? '0.0.0.0'

  try {
    const app = await buildServer()
    const server = http.createServer(app)
    server.keepAliveTimeout = 10 * 60 * 1000 // 10 minutes
    server.headersTimeout = 10 * 60 * 1000
    server.setTimeout(0)

    server.listen(port, host, () => {
      console.log(`API server running on http://${host}:${port}`)
    })
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}

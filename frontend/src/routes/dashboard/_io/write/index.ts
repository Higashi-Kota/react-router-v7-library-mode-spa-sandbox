import type { ActionFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import { z } from 'zod'
import { deleteTask, updateTask } from '../../../../api/tasks.js'
import { ApiError } from '../../../../lib/api-client.js'
import { normalizeRedirectTarget } from '../../../utils/redirect.js'

const statusSchema = z.enum(['pending', 'in_progress', 'completed'])

export async function dashboardAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = String(formData.get('_intent') ?? '')
  const redirectTo = normalizeRedirectTarget(
    formData.get('redirectTo'),
    request,
  )

  try {
    if (intent === 'update-status') {
      const taskId = String(formData.get('taskId') ?? '')
      const status = statusSchema.parse(formData.get('status'))
      await updateTask(taskId, { status })
      return { ok: true }
    }

    if (intent === 'delete-task') {
      const taskId = String(formData.get('taskId') ?? '')
      await deleteTask(taskId)
      return redirect(redirectTo)
    }

    return new Response(JSON.stringify({ error: '未定義の操作です' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Dashboard action failed', error)
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: error.issues.map((issue) => issue.message).join(', '),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({ error: error.message, details: error.details }),
        {
          status: error.status,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
    if (error instanceof Response) {
      return error
    }
    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

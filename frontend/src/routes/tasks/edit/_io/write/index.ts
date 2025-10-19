import { type ActionFunctionArgs, redirect } from 'react-router'
import { z } from 'zod'
import { updateTask } from '../../../../../api/tasks'
import type { TaskStatus } from '../../../../../features/task/domains/task'
import { normalizeRedirectTarget } from '../../../../utils/redirect'
import type { TaskEditActionData } from '../../_types'
import { updateFormSchema } from '../../_utils/schema'

export async function taskEditAction({ request, params }: ActionFunctionArgs) {
  if (!params.taskId) {
    throw new Response('Task ID is required', { status: 400 })
  }
  const formData = await request.formData()
  try {
    const parsed = updateFormSchema.parse({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      status: formData.get('status') ?? 'pending',
      dueDate: formData.get('dueDate') ?? undefined,
      redirectTo: formData.get('redirectTo') ?? undefined,
    })
    const updated = await updateTask(params.taskId, {
      title: parsed.title,
      description: parsed.description ?? '',
      status: parsed.status as TaskStatus,
      dueDate: parsed.dueDate,
    })
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const redirectTo = normalizeRedirectTarget(parsed.redirectTo, request)
    return redirect(redirectTo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const values: TaskEditActionData['values'] = {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        status: (formData.get('status') ?? 'pending') as TaskStatus,
        dueDate: formData.get('dueDate') ? `${formData.get('dueDate')}` : null,
      }
      return {
        errorMessage: error.issues.map((issue) => issue.message).join(', '),
        values,
      } satisfies TaskEditActionData
    }
    if (error instanceof Response) {
      return error
    }
    return {
      errorMessage: 'サーバーエラーが発生しました',
    } satisfies TaskEditActionData
  }
}

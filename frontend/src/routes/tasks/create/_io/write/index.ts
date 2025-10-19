import { type ActionFunctionArgs, redirect } from 'react-router'
import { z } from 'zod'
import { createTask } from '../../../../../api/tasks'
import type { TaskStatus } from '../../../../../features/task/domains/task'
import { normalizeRedirectTarget } from '../../../../utils/redirect'
import type { TaskCreateActionData } from '../../_types'
import { createFormSchema } from '../../_utils/schema'

export async function taskCreateAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  try {
    const parsed = createFormSchema.parse({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      status: formData.get('status') ?? 'pending',
      dueDate: formData.get('dueDate') ?? undefined,
      redirectTo: formData.get('redirectTo') ?? undefined,
    })
    await createTask({
      title: parsed.title,
      description: parsed.description ?? '',
      status: parsed.status as TaskStatus,
      dueDate: parsed.dueDate,
    })
    const redirectTo = normalizeRedirectTarget(parsed.redirectTo, request)
    return redirect(redirectTo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const values: TaskCreateActionData['values'] = {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        status: (formData.get('status') ?? 'pending') as TaskStatus,
        dueDate: formData.get('dueDate') ? `${formData.get('dueDate')}` : null,
      }
      return {
        errorMessage: error.issues.map((issue) => issue.message).join(', '),
        values,
      } satisfies TaskCreateActionData
    }
    if (error instanceof Response) {
      return error
    }
    return {
      errorMessage: 'サーバーエラーが発生しました',
    } satisfies TaskCreateActionData
  }
}

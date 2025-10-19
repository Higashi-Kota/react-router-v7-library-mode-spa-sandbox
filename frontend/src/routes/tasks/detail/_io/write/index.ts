import { type ActionFunctionArgs, redirect } from 'react-router'
import { deleteTask } from '../../../../../api/tasks'
import { normalizeRedirectTarget } from '../../../../utils/redirect'

export async function taskDetailAction({
  request,
  params,
}: ActionFunctionArgs) {
  if (!params.taskId) {
    throw new Response('Task ID is required', { status: 400 })
  }
  const formData = await request.formData()
  const intent = String(formData.get('_intent') ?? '')
  const redirectTo = normalizeRedirectTarget(
    formData.get('redirectTo'),
    request,
  )

  if (intent === 'delete') {
    await deleteTask(params.taskId)
    return redirect(redirectTo)
  }

  return new Response(JSON.stringify({ error: '未対応の操作です' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}

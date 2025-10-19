import type { ActionFunctionArgs } from 'react-router'
import { bulkMutateTasks } from '../../../../../api/tasks'
import { normalizeRedirectTarget } from '../../../../utils/redirect'
import { bulkPayloadSchema } from '../../_utils/schema'

export async function bulkAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const rawPayload = formData.get('payload')

  if (typeof rawPayload !== 'string') {
    return new Response(JSON.stringify({ error: 'payload is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const parsedPayload = bulkPayloadSchema.parse(JSON.parse(rawPayload))
  const summary = await bulkMutateTasks(parsedPayload)
  const redirectTo = normalizeRedirectTarget(
    formData.get('redirectTo'),
    request,
  )

  return {
    data: summary,
    redirectTo,
  }
}

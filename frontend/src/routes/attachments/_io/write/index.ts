import { type ActionFunctionArgs, redirect } from 'react-router'
import { z } from 'zod'
import { deleteAttachment } from '../../../../api/attachments'
import { jsonResponse } from '../../../utils/http'

const paramsSchema = z.object({
  taskId: z.string().min(1),
})

export async function taskAttachmentsAction({
  request,
  params,
}: ActionFunctionArgs) {
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonResponse({ error: 'InvalidTaskId' }, 400)
  }
  const taskId = parsed.data.taskId
  const formData = await request.formData()
  const intent = String(formData.get('_intent') ?? '')

  if (intent === 'delete-attachment') {
    const attachmentId = String(formData.get('attachmentId') ?? '')
    if (!attachmentId) {
      return jsonResponse({ error: 'AttachmentIdRequired' }, 400)
    }
    await deleteAttachment(taskId, attachmentId)
    return redirect('../attachments')
  }

  return jsonResponse({ error: 'UnsupportedIntent' }, 400)
}

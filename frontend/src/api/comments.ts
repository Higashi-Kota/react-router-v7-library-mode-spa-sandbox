import type { CommentNode } from '../features/comment/domains/comment'
import { apiRequest } from '../lib/api-client'

interface CommentListResponse {
  data: CommentNode[]
}

interface SingleCommentResponse {
  data: CommentNode
}

export async function fetchComments(taskId: string) {
  const response = await apiRequest<CommentListResponse>(
    `/api/tasks/${taskId}/comments`,
  )
  return response.data
}

export async function createComment(
  taskId: string,
  payload: {
    body: string
    parentId?: string | null
    author?: string
  },
) {
  const response = await apiRequest<SingleCommentResponse>(
    `/api/tasks/${taskId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return response.data
}

export async function updateComment(
  taskId: string,
  commentId: string,
  body: string,
) {
  const response = await apiRequest<SingleCommentResponse>(
    `/api/tasks/${taskId}/comments/${commentId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    },
  )
  return response.data
}

export async function deleteComment(taskId: string, commentId: string) {
  await apiRequest(`/api/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
    parseAs: 'none',
  })
}

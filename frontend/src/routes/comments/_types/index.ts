import type { CommentNode } from '../../../features/comment/domains/comment'

export interface TaskCommentsLoaderData {
  taskId: string
  comments: CommentNode[]
}

export interface TaskCommentsActionData {
  error?: string
}

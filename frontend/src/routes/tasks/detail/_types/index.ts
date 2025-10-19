import type { Attachment } from '../../../../features/attachment/domains/attachment'
import type { CommentNode } from '../../../../features/comment/domains/comment'
import type { Task } from '../../../../features/task/domains/task'

export interface TaskDetailLoaderData {
  task: Task
  attachments: Attachment[]
  comments: CommentNode[]
}

export interface TaskDetailOutletContext {
  task: Task
  redirectTo: string
  detailHref: string
}

export interface CommentNode {
  id: string
  taskId: string
  parentId: string | null
  body: string
  author: string
  createdAt: string
  updatedAt: string
  children: CommentNode[]
}

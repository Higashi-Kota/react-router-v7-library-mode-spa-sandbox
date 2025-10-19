import { customAlphabet } from 'nanoid'
import { getTask } from './store.js'

interface CommentNode {
  id: string
  taskId: string
  parentId: string | null
  body: string
  author: string
  createdAt: string
  updatedAt: string
  children: CommentNode[]
}

interface CommentRecord extends Omit<CommentNode, 'children'> {
  children: string[]
}

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)
const comments = new Map<string, CommentRecord>()
const taskComments = new Map<string, Set<string>>()

function nowISO() {
  return new Date().toISOString()
}

export function listCommentTree(taskId: string): CommentNode[] {
  const ids = taskComments.get(taskId)
  if (!ids) {
    return []
  }

  const roots: CommentNode[] = []

  ids.forEach((id) => {
    const record = comments.get(id)
    if (!record || record.parentId) {
      return
    }
    roots.push(toTree(record))
  })

  roots.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return roots
}

export function createComment(options: {
  taskId: string
  parentId?: string | null
  body: string
  author?: string
}): CommentNode {
  const { taskId, parentId = null, body, author } = options
  if (!getTask(taskId)) {
    throw new Error('Task not found')
  }

  if (parentId) {
    const parent = comments.get(parentId)
    if (!parent || parent.taskId !== taskId) {
      throw new Error('Parent comment not found')
    }
  }

  const id = nanoid()
  const record: CommentRecord = {
    id,
    taskId,
    parentId,
    body,
    author: author ?? '匿名ユーザー',
    createdAt: nowISO(),
    updatedAt: nowISO(),
    children: [],
  }
  comments.set(id, record)

  if (parentId) {
    const parent = comments.get(parentId)
    if (parent) {
      parent.children.push(id)
    }
  } else {
    const existing = taskComments.get(taskId)
    if (existing) {
      existing.add(id)
    } else {
      taskComments.set(taskId, new Set([id]))
    }
  }

  return toTree(record)
}

export function updateComment(options: {
  taskId: string
  commentId: string
  body: string
}): CommentNode {
  const { taskId, commentId, body } = options
  const record = comments.get(commentId)
  if (!record || record.taskId !== taskId) {
    throw new Error('Comment not found')
  }
  record.body = body
  record.updatedAt = nowISO()
  return toTree(record)
}

export function deleteComment(options: {
  taskId: string
  commentId: string
}): boolean {
  const { taskId, commentId } = options
  const record = comments.get(commentId)
  if (!record || record.taskId !== taskId) {
    return false
  }

  // remove descendants first
  record.children.forEach((childId) => {
    deleteComment({ taskId, commentId: childId })
  })

  if (record.parentId) {
    const parent = comments.get(record.parentId)
    parent?.children.splice(parent.children.indexOf(commentId), 1)
  } else {
    const set = taskComments.get(taskId)
    set?.delete(commentId)
    if (set && set.size === 0) {
      taskComments.delete(taskId)
    }
  }

  comments.delete(commentId)
  return true
}

function toTree(record: CommentRecord): CommentNode {
  const children = record.children
    .map((id) => comments.get(id))
    .filter((node): node is CommentRecord => Boolean(node))
    .map((child) => toTree(child))

  children.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    id: record.id,
    taskId: record.taskId,
    parentId: record.parentId,
    body: record.body,
    author: record.author,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    children,
  }
}

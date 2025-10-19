import { createBrowserRouter } from 'react-router'
import {
  TaskAttachmentsErrorBoundary,
  TaskAttachmentsRoute,
  taskAttachmentsAction,
  taskAttachmentsLoader,
} from './routes/attachments/route'
import {
  TaskCommentsErrorBoundary,
  TaskCommentsRoute,
  taskCommentsAction,
  taskCommentsLoader,
} from './routes/comments/route'
import {
  DashboardErrorBoundary,
  DashboardRoute,
  dashboardAction,
  dashboardLoader,
} from './routes/dashboard/route'
import {
  RootErrorBoundary,
  RootLayout,
  rootLoader,
  shouldRevalidate as rootShouldRevalidate,
} from './routes/root/route'
import { bulkAction } from './routes/tasks/bulk/route'
import {
  TaskCreateErrorBoundary,
  TaskCreateRoute,
  taskCreateAction,
  taskCreateLoader,
} from './routes/tasks/create/route'
import {
  TaskDetailErrorBoundary,
  TaskDetailRoute,
  taskDetailAction,
  taskDetailLoader,
} from './routes/tasks/detail/route'
import {
  TaskEditErrorBoundary,
  TaskEditRoute,
  taskEditAction,
  taskEditLoader,
} from './routes/tasks/edit/route'

export const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    loader: rootLoader,
    shouldRevalidate: rootShouldRevalidate,
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        index: true,
        loader: dashboardLoader,
        action: dashboardAction,
        Component: DashboardRoute,
        ErrorBoundary: DashboardErrorBoundary,
      },
      {
        path: 'tasks',
        loader: dashboardLoader,
        action: dashboardAction,
        Component: DashboardRoute,
        ErrorBoundary: DashboardErrorBoundary,
      },
      {
        path: 'tasks/new',
        loader: taskCreateLoader,
        action: taskCreateAction,
        Component: TaskCreateRoute,
        ErrorBoundary: TaskCreateErrorBoundary,
      },
      {
        path: 'tasks/:taskId/edit',
        loader: taskEditLoader,
        action: taskEditAction,
        Component: TaskEditRoute,
        ErrorBoundary: TaskEditErrorBoundary,
      },
      {
        path: 'tasks/:taskId',
        loader: taskDetailLoader,
        action: taskDetailAction,
        Component: TaskDetailRoute,
        ErrorBoundary: TaskDetailErrorBoundary,
        children: [
          {
            path: 'attachments',
            loader: taskAttachmentsLoader,
            action: taskAttachmentsAction,
            Component: TaskAttachmentsRoute,
            ErrorBoundary: TaskAttachmentsErrorBoundary,
          },
          {
            path: 'comments',
            loader: taskCommentsLoader,
            action: taskCommentsAction,
            Component: TaskCommentsRoute,
            ErrorBoundary: TaskCommentsErrorBoundary,
          },
        ],
      },
      {
        path: 'tasks/bulk',
        action: bulkAction,
      },
    ],
  },
])

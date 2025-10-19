import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './router'
import './styles/global.css'
import './styles/components.css'

const el = document.getElementById('root')

if (!el) {
  throw new Error('Root container not found')
}

createRoot(el).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

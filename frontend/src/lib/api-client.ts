export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
)

type ApiRequestInit = RequestInit & {
  parseAs?: 'json' | 'text' | 'none'
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path
  const headers = new Headers(init.headers)
  if (
    !headers.has('Content-Type') &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  const response = await fetch(url, {
    ...init,
    headers,
  })

  const parseAs = init.parseAs ?? 'json'

  if (!response.ok) {
    let details: unknown
    if (parseAs === 'json') {
      try {
        details = await response.json()
      } catch (_) {
        details = await response.text()
      }
    } else if (parseAs === 'text') {
      details = await response.text()
    }
    throw new ApiError(
      response.statusText || 'Request failed',
      response.status,
      details,
    )
  }

  if (response.status === 204 || parseAs === 'none') {
    return undefined as T
  }

  if (parseAs === 'text') {
    return (await response.text()) as T
  }

  return (await response.json()) as T
}

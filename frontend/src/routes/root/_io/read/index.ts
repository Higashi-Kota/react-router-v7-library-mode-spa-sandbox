import type { LoaderFunctionArgs } from 'react-router'
import { apiRequest } from '../../../../lib/api-client'
import type { RootLoaderData } from '../../_types'

export async function rootLoader({
  request,
}: LoaderFunctionArgs): Promise<RootLoaderData> {
  void request
  try {
    const response = await apiRequest<{ status: string; timestamp: string }>(
      '/health',
    )
    return { health: response }
  } catch (error) {
    console.warn('API health check failed', error)
    return { health: null }
  }
}

export function normalizeRedirectTarget(
  raw: unknown,
  request: Request,
): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return '/tasks'
  }

  try {
    const base = new URL(request.url)
    const target = new URL(raw, `${base.origin}/`)
    if (target.origin !== base.origin) {
      return '/tasks'
    }
    const normalized = `${target.pathname}${target.search}${target.hash}`
    return normalized.length > 0 ? normalized : '/tasks'
  } catch (error) {
    console.warn('normalizeRedirectTarget failed', { raw, error })
    return '/tasks'
  }
}

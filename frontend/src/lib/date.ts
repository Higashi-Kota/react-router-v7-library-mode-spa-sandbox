export function formatDateTime(
  value: string | null,
  options: Intl.DateTimeFormatOptions = {},
) {
  if (!value) {
    return '未設定'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date)
}

export function formatRelative(value: string | null) {
  if (!value) {
    return '期限なし'
  }
  const date = new Date(value)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const dayMs = 86400000
  const days = Math.round(diff / dayMs)
  if (Math.abs(days) <= 1) {
    return diff >= 0 ? '明日まで' : '昨日まで'
  }
  if (days > 0) {
    return `${days}日後`
  }
  return `${Math.abs(days)}日前`
}

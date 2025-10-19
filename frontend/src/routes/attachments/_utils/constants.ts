export const ATTACHMENT_UPLOAD_CHUNK = {
  enabled: true,
  chunkSize: 1024 * 1024 * 8, // 8MB
  maxRetries: 5,
  retryDelayMs: 750,
} as const

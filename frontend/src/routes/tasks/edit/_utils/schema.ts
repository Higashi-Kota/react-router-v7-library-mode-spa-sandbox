import { z } from 'zod'

export const statusSchema = z.enum(['pending', 'in_progress', 'completed'])

export const updateFormSchema = z.object({
  title: z.string().trim().min(1, 'タイトルは必須です'),
  description: z.string().optional(),
  status: statusSchema,
  dueDate: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value).toISOString() : null)),
  redirectTo: z.string().default('/'),
})

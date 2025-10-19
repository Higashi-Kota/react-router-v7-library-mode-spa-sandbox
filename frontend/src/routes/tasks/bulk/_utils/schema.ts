import { z } from 'zod'

export const bulkPayloadSchema = z
  .object({
    create: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          status: z.enum(['pending', 'in_progress', 'completed']).optional(),
          dueDate: z.string().optional().or(z.null()),
        }),
      )
      .optional(),
    update: z
      .array(
        z.object({
          id: z.string(),
          data: z
            .object({
              title: z.string().optional(),
              description: z.string().optional(),
              status: z
                .enum(['pending', 'in_progress', 'completed'])
                .optional(),
              dueDate: z.string().optional().or(z.null()),
            })
            .refine((value) => Object.keys(value).length > 0, {
              message: 'update data must not be empty',
            }),
        }),
      )
      .optional(),
    delete: z.array(z.string()).optional(),
  })
  .refine((value) => value.create || value.update || value.delete, {
    message: 'At least one bulk operation is required',
  })

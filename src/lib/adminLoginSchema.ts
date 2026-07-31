import { z } from 'zod'

export const adminLoginSchema = z.object({
  email: z.string().trim().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

export type AdminLoginValues = z.infer<typeof adminLoginSchema>

import { z } from 'zod'

export const bookingFormSchema = z.object({
  clientName: z.string().trim().min(2, 'Введите имя'),
  clientPhone: z
    .string()
    .trim()
    .min(10, 'Введите номер телефона')
    .regex(/^[+\d][\d\s\-()]{9,}$/, 'Введите корректный номер телефона'),
  clientEmail: z.string().trim().email('Введите корректный email'),
  backgroundId: z.string().min(1, 'Выберите фон'),
  guestsCount: z.number().int().min(1, 'Минимум 1 человек').max(6, 'Максимум 6 человек'),
  withPet: z.boolean(),
  comment: z.string().max(500, 'Слишком длинный комментарий').optional(),
  pdnConsent: z.boolean().refine((v) => v === true, {
    message: 'Необходимо согласие на обработку персональных данных',
  }),
})

export type BookingFormValues = z.infer<typeof bookingFormSchema>

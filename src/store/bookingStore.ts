import { create } from 'zustand'
import type { SlotRow } from '../lib/booking'

export type BookingStep = 'slot' | 'form' | 'processing' | 'confirmed'

export type ConfirmedSummary = {
  dateISO: string
  startTime: string
  endTime: string
  email: string
  code: string
  priceKopecks: number
  basePriceKopecks: number
  addonKopecks: number
  backgroundKopecks: number
  discountKopecks: number
  promoCode: string | null
}

type BookingStore = {
  step: BookingStep
  duration: number
  heldSlots: SlotRow[]
  holdToken: string | null
  holdExpiresAt: number | null
  confirmed: ConfirmedSummary | null
  error: string | null

  setDuration: (duration: number) => void
  setError: (error: string | null) => void
  setHold: (slots: SlotRow[], token: string, expiresAt: number) => void
  clearHold: () => void
  goToForm: () => void
  goToProcessing: () => void
  setConfirmed: (summary: ConfirmedSummary) => void
  backToSlots: (error?: string) => void
  reset: () => void
}

export const useBookingStore = create<BookingStore>((set) => ({
  step: 'slot',
  duration: 1,
  heldSlots: [],
  holdToken: null,
  holdExpiresAt: null,
  confirmed: null,
  error: null,

  setDuration: (duration) => set({ duration }),
  setError: (error) => set({ error }),

  setHold: (slots, token, expiresAt) =>
    set({
      heldSlots: slots,
      holdToken: token,
      holdExpiresAt: expiresAt,
      error: null,
    }),

  clearHold: () =>
    set({
      heldSlots: [],
      holdToken: null,
      holdExpiresAt: null,
    }),

  goToForm: () => set({ step: 'form' }),
  goToProcessing: () => set({ step: 'processing' }),

  setConfirmed: (summary) =>
    set({
      step: 'confirmed',
      confirmed: summary,
      heldSlots: [],
      holdToken: null,
      holdExpiresAt: null,
    }),

  backToSlots: (error) =>
    set({
      step: 'slot',
      heldSlots: [],
      holdToken: null,
      holdExpiresAt: null,
      error: error ?? null,
    }),

  reset: () =>
    set({
      step: 'slot',
      heldSlots: [],
      holdToken: null,
      holdExpiresAt: null,
      confirmed: null,
      error: null,
    }),
}))

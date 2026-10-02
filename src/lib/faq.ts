import { supabase } from './supabase'

export type FaqRow = {
  id: string
  question: string
  answer: string
  sort_order: number
  is_published: boolean
  created_at: string
}

export class FaqError extends Error {}

/** Публичный список — RLS отдаёт только опубликованные вопросы. */
export async function fetchPublishedFaq(): Promise<FaqRow[]> {
  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new FaqError(error.message)
  return data ?? []
}

export async function fetchAllFaqAdmin(): Promise<FaqRow[]> {
  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new FaqError(error.message)
  return data ?? []
}

export type FaqInput = {
  question: string
  answer: string
  sortOrder: number
}

export async function createFaq(input: FaqInput): Promise<void> {
  const { error } = await supabase.from('faq_items').insert({
    question: input.question,
    answer: input.answer,
    sort_order: input.sortOrder,
  })
  if (error) throw new FaqError(error.message)
}

export async function updateFaq(id: string, input: FaqInput): Promise<void> {
  const { error } = await supabase
    .from('faq_items')
    .update({ question: input.question, answer: input.answer, sort_order: input.sortOrder })
    .eq('id', id)
  if (error) throw new FaqError(error.message)
}

export async function setFaqPublished(id: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from('faq_items').update({ is_published: isPublished }).eq('id', id)
  if (error) throw new FaqError(error.message)
}

export async function deleteFaq(id: string): Promise<void> {
  const { error } = await supabase.from('faq_items').delete().eq('id', id)
  if (error) throw new FaqError(error.message)
}

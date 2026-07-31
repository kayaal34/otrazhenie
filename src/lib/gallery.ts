import { supabase } from './supabase'

export type GalleryPhoto = {
  id: string
  storage_path: string
  caption: string | null
  is_published: boolean
  sort_order: number
  created_at: string
}

export class GalleryError extends Error {}

const BUCKET = 'gallery'
const MAX_FILE_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function getPhotoUrl(storagePath: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

export async function fetchPublishedPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw new GalleryError(error.message)
  return data ?? []
}

export async function fetchAllPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new GalleryError(error.message)
  return data ?? []
}

export async function uploadPhoto(file: File, caption: string): Promise<void> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new GalleryError('Разрешены только JPEG, PNG или WebP.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new GalleryError('Файл слишком большой (максимум 8 МБ).')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  })
  if (uploadError) throw new GalleryError(uploadError.message)

  const { error: insertError } = await supabase
    .from('gallery_photos')
    .insert({ storage_path: path, caption: caption || null })

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new GalleryError(insertError.message)
  }
}

export async function togglePublish(id: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase
    .from('gallery_photos')
    .update({ is_published: isPublished })
    .eq('id', id)

  if (error) throw new GalleryError(error.message)
}

export async function deletePhoto(photo: GalleryPhoto): Promise<void> {
  const { error: deleteRowError } = await supabase
    .from('gallery_photos')
    .delete()
    .eq('id', photo.id)

  if (deleteRowError) throw new GalleryError(deleteRowError.message)

  await supabase.storage.from(BUCKET).remove([photo.storage_path])
}

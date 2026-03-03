import { supabase } from './supabase'

const DEFAULT_PUBLIC_SOUNDS_BUCKET = 'idle-rpg-sounds'
const DEFAULT_SOUNDS_FOLDER = 'particles'

function getEnvString(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function getFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.trim().toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName
  if (file.type.startsWith('audio/')) return file.type.replace('audio/', '').toLowerCase()
  return 'bin'
}

function buildUploadPath(file: File, folder: string): string {
  const ext = getFileExtension(file)
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${folder}/${Date.now()}-${randomPart}.${ext}`
}

export async function uploadPublicSound(file: File): Promise<string> {
  const bucket = getEnvString('VITE_SUPABASE_PUBLIC_SOUNDS_BUCKET') ?? DEFAULT_PUBLIC_SOUNDS_BUCKET
  const folder = getEnvString('VITE_SUPABASE_PUBLIC_SOUNDS_FOLDER') ?? DEFAULT_SOUNDS_FOLDER
  const path = buildUploadPath(file, folder)

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: false,
      cacheControl: '31536000',
      contentType: file.type || undefined,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  if (!data.publicUrl) {
    throw new Error('Failed to resolve public URL for uploaded sound.')
  }
  return data.publicUrl
}

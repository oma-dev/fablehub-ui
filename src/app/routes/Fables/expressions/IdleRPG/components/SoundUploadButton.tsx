import { useRef, useState, type ChangeEvent } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { uploadPublicSound } from '../../../../../../lib/supabaseStorage'

type Props = {
  disabled?: boolean
  onUploaded: (url: string) => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Failed to upload sound.'
}

export default function SoundUploadButton({ disabled, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const openPicker = () => fileInputRef.current?.click()

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setIsUploading(true)
      const url = await uploadPublicSound(file)
      onUploaded(url)
    } catch (error) {
      // Keep UI simple: the upload button is used in tight form layouts.
      window.alert(getErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="small"
        variant="outlined"
        onClick={openPicker}
        disabled={disabled || isUploading}
        startIcon={isUploading ? <CircularProgress size={14} color="inherit" /> : undefined}
      >
        {isUploading ? 'Uploading...' : 'Upload sound'}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
        hidden
        onChange={onFileSelected}
      />
    </>
  )
}

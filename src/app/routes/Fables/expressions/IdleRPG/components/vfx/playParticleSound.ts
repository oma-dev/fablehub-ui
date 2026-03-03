import { useEffect } from 'react'

function clampSoundVolumePercent(volumePercent?: number): number {
  if (volumePercent == null || Number.isNaN(volumePercent)) return 1
  return Math.min(1, Math.max(0, volumePercent / 100))
}

export function useParticleSound(
  show: boolean,
  soundUrl: string | undefined,
  soundVolumePercent: number | undefined,
  id: string | number,
  delayMs = 0,
) {
  useEffect(() => {
    if (!show) return
    const trimmed = soundUrl?.trim()
    if (!trimmed) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const play = () => {
      const audio = new Audio(trimmed)
      audio.volume = clampSoundVolumePercent(soundVolumePercent)
      audio.play().catch(() => undefined)
    }

    if (delayMs > 0) timer = setTimeout(play, delayMs)
    else play()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [show, soundUrl, soundVolumePercent, id, delayMs])
}

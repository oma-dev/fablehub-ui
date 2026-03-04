import { useEffect } from 'react'

function clampSoundVolumePercent(volumePercent?: number): number {
  if (volumePercent == null || Number.isNaN(volumePercent)) return 1
  return Math.min(1, Math.max(0, volumePercent / 100))
}

function animateVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
): () => void {
  const clampedFrom = Math.min(1, Math.max(0, from))
  const clampedTo = Math.min(1, Math.max(0, to))
  if (durationMs <= 0) {
    audio.volume = clampedTo
    return () => undefined
  }
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const startedAt = Date.now()

  const tick = () => {
    if (cancelled) return
    const elapsed = Date.now() - startedAt
    const progress = Math.min(1, elapsed / durationMs)
    audio.volume = clampedFrom + ((clampedTo - clampedFrom) * progress)
    if (progress < 1) {
      timer = setTimeout(tick, 16)
    }
  }

  tick()
  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}

export function useParticleSound(
  show: boolean,
  soundUrl: string | undefined,
  soundVolumePercent: number | undefined,
  id: string | number,
  delayMs = 0,
  fadeInMs = 0,
  fadeOutMs = 0,
) {
  useEffect(() => {
    if (!show) return
    const trimmed = soundUrl?.trim()
    if (!trimmed) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let fadeOutTimer: ReturnType<typeof setTimeout> | undefined
    let audio: HTMLAudioElement | null = null
    let stopFadeIn: (() => void) | null = null
    let stopFadeOut: (() => void) | null = null
    const play = () => {
      audio = new Audio(trimmed)
      const targetVolume = clampSoundVolumePercent(soundVolumePercent)
      audio.volume = fadeInMs > 0 ? 0 : targetVolume
      audio.play().catch(() => undefined)
      if (fadeInMs > 0) {
        stopFadeIn = animateVolume(audio, 0, targetVolume, fadeInMs)
      }
      if (fadeOutMs > 0) {
        audio.addEventListener('loadedmetadata', () => {
          if (!audio) return
          const durationMs = Number.isFinite(audio.duration) ? Math.floor(audio.duration * 1000) : 0
          if (durationMs <= 0) return
          const fadeOutStartMs = Math.max(0, durationMs - fadeOutMs)
          fadeOutTimer = setTimeout(() => {
            if (!audio) return
            stopFadeOut = animateVolume(audio, audio.volume, 0, fadeOutMs)
          }, fadeOutStartMs)
        }, { once: true })
      }
    }

    if (delayMs > 0) timer = setTimeout(play, delayMs)
    else play()

    return () => {
      if (timer) clearTimeout(timer)
      if (fadeOutTimer) clearTimeout(fadeOutTimer)
      if (stopFadeIn) stopFadeIn()
      if (stopFadeOut) stopFadeOut()
      if (audio) {
        audio.pause()
        audio.src = ''
        audio = null
      }
    }
  }, [show, soundUrl, soundVolumePercent, id, delayMs, fadeInMs, fadeOutMs])
}

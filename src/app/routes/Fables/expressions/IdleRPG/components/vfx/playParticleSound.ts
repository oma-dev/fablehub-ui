import { useEffect } from 'react'

export function useParticleSound(show: boolean, soundUrl: string | undefined, id: string | number, delayMs = 0) {
  useEffect(() => {
    if (!show) return
    const trimmed = soundUrl?.trim()
    if (!trimmed) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const play = () => {
      const audio = new Audio(trimmed)
      audio.play().catch(() => undefined)
    }

    if (delayMs > 0) timer = setTimeout(play, delayMs)
    else play()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [show, soundUrl, id, delayMs])
}

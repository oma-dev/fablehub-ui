import { motion } from 'framer-motion'
import { getAccelerationEase } from './motionEasing'
import { useParticleSound } from './playParticleSound'

const DEFAULT_SIZE = 96

interface Props {
  id: string | number
  url: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
  delayMs?: number
  lifetimeMs?: number
  startSizePx?: number
  endSizePx?: number
  offsetX?: number
  offsetY?: number
  endOffsetX?: number
  endOffsetY?: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
  loop?: boolean
}

export default function StatusParticleEffect({
  id,
  url,
  soundUrl,
  soundVolumePercent,
  soundFadeInMs = 0,
  soundFadeOutMs = 0,
  delayMs = 0,
  lifetimeMs = 1000,
  startSizePx,
  endSizePx,
  offsetX = 0,
  offsetY = 0,
  endOffsetX,
  endOffsetY,
  acceleration = 0,
  rotationStart = 0,
  rotationEnd,
  loop = false,
}: Props) {
  useParticleSound(true, soundUrl, soundVolumePercent, id, delayMs, soundFadeInMs, soundFadeOutMs)

  const clampedLifetimeMs = Math.max(100, lifetimeMs)
  const startSize = startSizePx ?? endSizePx ?? DEFAULT_SIZE
  const endSize = endSizePx ?? startSizePx ?? DEFAULT_SIZE
  const baseSize = Math.max(startSize, endSize, 1)
  const initialScale = startSize / baseSize
  const finalScale = endSize / baseSize
  const targetOffsetX = endOffsetX ?? offsetX
  const targetOffsetY = endOffsetY ?? offsetY
  const deltaX = targetOffsetX - offsetX
  const deltaY = targetOffsetY - offsetY
  const finalRotation = rotationEnd ?? rotationStart
  const totalSec = clampedLifetimeMs / 1000
  const motionEase = getAccelerationEase(acceleration)
  const loopTransition = { repeat: Infinity, repeatType: 'loop' as const, repeatDelay: 0 }

  const animateProps = loop
    ? {
        opacity: 1,
        scale: [initialScale, finalScale],
        x: deltaX,
        y: deltaY,
        rotate: finalRotation,
      }
    : {
        opacity: [0, 1, 1, 0],
        scale: [initialScale, finalScale, finalScale],
        x: deltaX,
        y: deltaY,
        rotate: finalRotation,
      }

  const transitionProps = loop
    ? {
        delay: delayMs / 1000,
        duration: totalSec,
        opacity: { duration: Math.min(0.2, totalSec * 0.2), ease: 'easeOut' },
        scale: { duration: totalSec, ease: 'easeOut', ...loopTransition },
        x: { duration: totalSec, ease: motionEase, ...loopTransition },
        y: { duration: totalSec, ease: motionEase, ...loopTransition },
        rotate: { duration: totalSec, ease: motionEase, ...loopTransition },
      }
    : {
        delay: delayMs / 1000,
        duration: totalSec,
        opacity: { times: [0, 0.12, 0.88, 1], ease: 'easeInOut' },
        scale: { duration: totalSec, ease: 'easeOut' },
        x: { duration: totalSec, ease: motionEase },
        y: { duration: totalSec, ease: motionEase },
        rotate: { duration: totalSec, ease: motionEase },
      }

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, scale: initialScale, x: 0, y: 0, rotate: rotationStart }}
      animate={animateProps}
      transition={transitionProps}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -baseSize / 2 + offsetY,
        marginLeft: -baseSize / 2 + offsetX,
        width: baseSize,
        height: baseSize,
        pointerEvents: 'none',
        zIndex: 11,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={url}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.45))',
        }}
      />
    </motion.div>
  )
}

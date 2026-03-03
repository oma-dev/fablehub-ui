import { motion, AnimatePresence } from 'framer-motion'
import { useParticleSound } from './playParticleSound'

const DEFAULT_SIZE = 140

interface Props {
  show: boolean
  url: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  side: 'player' | 'creature'
  showMs?: number
  vanishMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX?: number
  offsetY?: number
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
  /** Mirror frame horizontally (used for right-side combatants). */
  mirrored?: boolean
  id: string | number
}

/**
 * Block animation frame: centered on the defender's portrait.
 */
export default function BlockFrame({
  show,
  url,
  soundUrl,
  soundVolumePercent,
  showMs = 100,
  vanishMs = 500,
  sizePx,
  startSizePx,
  endSizePx,
  offsetX = 0,
  offsetY = 0,
  rotationStart = 0,
  rotationEnd,
  mirrored = false,
  id,
}: Props) {
  useParticleSound(show, soundUrl, soundVolumePercent, id)

  const totalSec = showMs / 1000 + vanishMs / 1000
  let fadeStart = showMs / 1000 / totalSec
  if (fadeStart < 0.08) fadeStart = 0.08
  const startSize = startSizePx ?? sizePx ?? DEFAULT_SIZE
  const endSize = endSizePx ?? sizePx ?? DEFAULT_SIZE
  const baseSize = Math.max(startSize, endSize, 1)
  const initialScale = startSize / baseSize
  const finalScale = endSize / baseSize
  const finalRotation = rotationEnd ?? rotationStart

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: initialScale, rotate: rotationStart }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [initialScale, finalScale],
            rotate: finalRotation,
            transition: {
              opacity: {
                times: [0, 0.08, fadeStart, 1],
                duration: totalSec,
                ease: 'easeOut',
              },
              scale: { duration: totalSec, ease: 'easeOut' },
              rotate: { duration: totalSec, ease: 'easeOut' },
            },
          }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -baseSize / 2 + offsetX,
            marginTop: -baseSize / 2 + offsetY,
            width: baseSize,
            height: baseSize,
            pointerEvents: 'none',
            zIndex: 20,
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
              filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.5))',
              transform: mirrored ? 'scaleX(-1)' : undefined,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { motion, AnimatePresence } from 'framer-motion'
import { getAccelerationEase } from './motionEasing'

const DEFAULT_SIZE = 140

interface Props {
  show: boolean
  url: string
  /** How long fully visible before starting fade, in ms */
  showMs?: number
  /** Fade-out (vanish) duration in ms */
  vanishMs?: number
  /** Display size in px (single size fallback). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over show+vanish. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px from target portrait center (positive = right). */
  offsetX?: number
  /** Vertical offset in px from target portrait center (positive = down). */
  offsetY?: number
  /** End horizontal offset in px at the end of this frame's lifetime (positive = right). */
  endOffsetX?: number
  /** End vertical offset in px at the end of this frame's lifetime (positive = down). */
  endOffsetY?: number
  /** Motion acceleration curve. 0 = linear, positive = accelerate, negative = decelerate. */
  acceleration?: number
  /** Mirror frame horizontally (used for right-side combatants). */
  mirrored?: boolean
  id: string | number
}

export default function ImpactFrame({
  show,
  url,
  showMs = 100,
  vanishMs = 500,
  sizePx,
  startSizePx,
  endSizePx,
  offsetX = 0,
  offsetY = 0,
  endOffsetX,
  endOffsetY,
  acceleration = 0,
  mirrored = false,
  id,
}: Props) {
  const totalSec = showMs / 1000 + vanishMs / 1000
  let fadeStart = showMs / 1000 / totalSec
  // Keyframe times must be monotonically non-decreasing (Web Animations API requirement)
  if (fadeStart < 0.08) fadeStart = 0.08
  const startSize = startSizePx ?? sizePx ?? DEFAULT_SIZE
  const endSize = endSizePx ?? sizePx ?? DEFAULT_SIZE
  const baseSize = Math.max(startSize, endSize, 1)
  const initialScale = startSize / baseSize
  const finalScale = endSize / baseSize
  const targetOffsetX = endOffsetX ?? offsetX
  const targetOffsetY = endOffsetY ?? offsetY
  const deltaX = targetOffsetX - offsetX
  const deltaY = targetOffsetY - offsetY
  const motionEase = getAccelerationEase(acceleration)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: initialScale, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [initialScale, finalScale],
            x: deltaX,
            y: deltaY,
            transition: {
              opacity: {
                times: [0, 0.08, fadeStart, 1],
                duration: totalSec,
                ease: 'easeOut',
              },
              scale: { duration: totalSec, ease: 'easeOut' },
              x: { duration: totalSec, ease: motionEase },
              y: { duration: totalSec, ease: motionEase },
            },
          }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: -baseSize / 2 + offsetY,
            marginLeft: -baseSize / 2 + offsetX,
            width: baseSize,
            height: baseSize,
            pointerEvents: 'none',
            zIndex: 15,
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

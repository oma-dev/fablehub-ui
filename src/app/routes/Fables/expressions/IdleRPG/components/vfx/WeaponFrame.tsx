import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion'
import { getAccelerationEase } from './motionEasing'

const DEFAULT_SIZE = 120
const DEFAULT_FADE_IN_MS = 200

interface Props {
  show: boolean
  url: string
  /** Fade-in duration in ms. Default 200. */
  fadeInMs?: number
  /**
   * Total lifetime in ms from appearance to fully gone.
   * Controls when the particle fades out.
   * If not set the particle stays visible until `show` becomes false.
   */
  lifetimeMs?: number
  /** Display size in px (single size, or fallback when start/end not both set). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over fadeInMs. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px from portrait center (positive = right). */
  offsetX?: number
  /** Vertical offset in px from portrait center (positive = down). */
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

export default function WeaponFrame({
  show, url,
  fadeInMs = DEFAULT_FADE_IN_MS,
  lifetimeMs,
  sizePx, startSizePx, endSizePx,
  offsetX = 0, offsetY = 0,
  endOffsetX, endOffsetY,
  acceleration = 0,
  mirrored = false,
  id,
}: Props) {
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

  // When lifetimeMs is given, animate the complete lifecycle as one keyframe sequence.
  // Fade-out uses the same duration as fade-in (symmetric), capped to leave at least
  // some hold time in the middle.
  let animateProps: TargetAndTransition
  let transitionProps: TargetAndTransition['transition']

  if (lifetimeMs && lifetimeMs > fadeInMs) {
    const totalSec = lifetimeMs / 1000
    const fadeOutMs = Math.min(fadeInMs, lifetimeMs * 0.4)
    const t1 = Math.max(0, Math.min(1, fadeInMs / lifetimeMs))
    let t2 = Math.max(0, Math.min(1, (lifetimeMs - fadeOutMs) / lifetimeMs))
    // Keyframe times must be monotonically non-decreasing (Web Animations API requirement)
    if (t2 < t1) t2 = t1
    animateProps = {
      opacity: [0, 1, 1, 0],
      scale: [initialScale, finalScale, finalScale],
      x: deltaX,
      y: deltaY,
    }
    transitionProps = {
      opacity: { times: [0, t1, t2, 1], duration: totalSec, ease: 'easeInOut' },
      scale: { duration: fadeInMs / 1000, ease: 'easeOut' },
      x: { duration: totalSec, ease: motionEase },
      y: { duration: totalSec, ease: motionEase },
    }
  } else {
    animateProps = { opacity: 1, scale: finalScale, x: deltaX, y: deltaY }
    transitionProps = {
      opacity: { duration: fadeInMs / 1000, ease: 'easeOut' },
      scale: { duration: fadeInMs / 1000, ease: 'easeOut' },
      x: { duration: fadeInMs / 1000, ease: motionEase },
      y: { duration: fadeInMs / 1000, ease: motionEase },
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: initialScale, x: 0, y: 0 }}
          animate={animateProps}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
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
            zIndex: 8,
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
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
              transform: mirrored ? 'scaleX(-1)' : undefined,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

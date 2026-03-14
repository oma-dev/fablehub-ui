import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion'
import { getAccelerationEase } from './motionEasing'
import { useParticleSound } from './playParticleSound'
import {
  getEquippedItemGlowBackdropStyle,
  getEquippedItemGlowImageFilter,
  type EquippedItemGlowVariant,
} from './equippedItemGlow'

const DEFAULT_SIZE = 120
const DEFAULT_FADE_IN_MS = 200
const VFX_Z_INDEX = 2100

interface Props {
  show: boolean
  url: string
  glowVariant?: EquippedItemGlowVariant
  glowColorHex?: string
  /** Optional sound URL played when this particle starts. */
  soundUrl?: string
  /** Optional sound volume in percent (0-100). Default 100. */
  soundVolumePercent?: number
  /** Optional sound fade-in duration in ms. */
  soundFadeInMs?: number
  /** Optional sound fade-out duration in ms. */
  soundFadeOutMs?: number
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
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
  /** Mirror frame horizontally (used for right-side combatants). */
  mirrored?: boolean
  id: string | number
}

export default function WeaponFrame({
  show, url,
  glowVariant,
  glowColorHex,
  soundUrl,
  soundVolumePercent,
  soundFadeInMs = 0,
  soundFadeOutMs = 0,
  fadeInMs = DEFAULT_FADE_IN_MS,
  lifetimeMs,
  sizePx, startSizePx, endSizePx,
  offsetX = 0, offsetY = 0,
  endOffsetX, endOffsetY,
  acceleration = 0,
  rotationStart = 0,
  rotationEnd,
  mirrored = false,
  id,
}: Props) {
  useParticleSound(show, soundUrl, soundVolumePercent, id, 0, soundFadeInMs, soundFadeOutMs)

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
  const finalRotation = rotationEnd ?? rotationStart
  const glowBackdropStyle = getEquippedItemGlowBackdropStyle(glowVariant, glowColorHex)
  const imageFilter = getEquippedItemGlowImageFilter(glowVariant, glowColorHex, 'medium')

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
      rotate: finalRotation,
    }
    transitionProps = {
      opacity: { times: [0, t1, t2, 1], duration: totalSec, ease: 'easeInOut' },
      scale: { duration: fadeInMs / 1000, ease: 'easeOut' },
      x: { duration: totalSec, ease: motionEase },
      y: { duration: totalSec, ease: motionEase },
      rotate: { duration: totalSec, ease: motionEase },
    }
  } else {
    animateProps = { opacity: 1, scale: finalScale, x: deltaX, y: deltaY, rotate: finalRotation }
    transitionProps = {
      opacity: { duration: fadeInMs / 1000, ease: 'easeOut' },
      scale: { duration: fadeInMs / 1000, ease: 'easeOut' },
      x: { duration: fadeInMs / 1000, ease: motionEase },
      y: { duration: fadeInMs / 1000, ease: motionEase },
      rotate: { duration: fadeInMs / 1000, ease: motionEase },
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: initialScale, x: 0, y: 0, rotate: rotationStart }}
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
            zIndex: VFX_Z_INDEX,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {glowBackdropStyle && <div aria-hidden style={glowBackdropStyle} />}
          <img
            src={url}
            alt=""
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: imageFilter,
              transform: mirrored ? 'scaleX(-1)' : undefined,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

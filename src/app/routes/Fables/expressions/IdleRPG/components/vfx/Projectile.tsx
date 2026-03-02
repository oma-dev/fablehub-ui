import { motion, AnimatePresence } from 'framer-motion'
import type { ProjectileType } from './animationConfig'
import { getAccelerationEase } from './motionEasing'

export interface ProjectilePos {
  x: number
  y: number
}

interface Props {
  show: boolean
  color: string
  direction: 'left-to-right' | 'right-to-left'
  id: string | number
  weaponUrl?: string | null
  /** Mirror projectile image horizontally. */
  mirrored?: boolean
  /** Motion acceleration curve. 0 = linear, positive = accelerate, negative = decelerate. */
  acceleration?: number
  /** Rotation at frame start in degrees. */
  rotationStart?: number
  /** Rotation at frame end in degrees. */
  rotationEnd?: number
  trajectory?: ProjectileType
  /** Override flight duration in ms (when e.g. from AnimationFrames.projectile.speedMs). */
  durationMs?: number
  /** Display size in px (width & height). Single size fallback. */
  sizePx?: number
  /** Start size in px; animates to endSizePx over flight. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Start position relative to the arena container */
  from?: ProjectilePos
  /** End position relative to the arena container */
  to?: ProjectilePos
}

const ARC_PEAK = -70

/** Projectile flight duration in seconds. Lower = faster. */
export const PROJECTILE_SPEED = 0.4

/** Weapon image size in px (width & height). */
export const PROJECTILE_SIZE = 300

function tipRotation(direction: 'left-to-right' | 'right-to-left') {
  return direction === 'left-to-right' ? 90 : -90
}

function WeaponProjectile({
  direction,
  weaponUrl,
  trajectory,
  id,
  from,
  to,
  durationSec,
  sizePx,
  startSizePx,
  endSizePx,
  mirrored = false,
  acceleration = 0,
  rotationStart = 0,
  rotationEnd,
}: {
  direction: 'left-to-right' | 'right-to-left'
  weaponUrl: string
  trajectory: 'straight' | 'arc'
  id: string | number
  from: ProjectilePos
  to: ProjectilePos
  durationSec: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  mirrored?: boolean
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
}) {
  const baseRotation = tipRotation(direction)
  const finalRotation = rotationEnd ?? rotationStart
  const duration = trajectory === 'arc' ? durationSec * 1.25 : durationSec
  const singleSize = sizePx ?? PROJECTILE_SIZE
  const startSize = startSizePx ?? sizePx ?? PROJECTILE_SIZE
  const endSize = endSizePx ?? sizePx ?? PROJECTILE_SIZE
  const animateSize = startSizePx != null && endSizePx != null && startSizePx !== endSizePx
  const size = animateSize ? endSize : singleSize
  const flightDuration = trajectory === 'arc' ? duration : durationSec
  const motionEase = getAccelerationEase(acceleration)

  const imgStyle = {
    objectFit: 'contain' as const,
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
    transform: mirrored ? 'scaleX(-1)' : undefined,
  }
  const imgEl = (
    animateSize
      ? (
        <motion.div
          initial={{ width: startSize, height: startSize }}
          animate={{ width: endSize, height: endSize }}
          transition={{ duration: flightDuration, ease: 'easeInOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img src={weaponUrl} alt="" style={{ width: '100%', height: '100%', ...imgStyle }} />
        </motion.div>
        )
      : <img src={weaponUrl} alt="" style={{ width: size, height: size, ...imgStyle }} />
  )

  if (trajectory === 'arc') {
    return (
      <motion.div
        key={id}
        initial={{
          left: from.x,
          top: from.y,
          x: '-50%',
          y: '-50%',
          rotate: baseRotation + rotationStart,
          opacity: 0,
          scale: 0.6,
        }}
        animate={{
          left: to.x,
          top: [from.y, Math.min(from.y, to.y) + ARC_PEAK, to.y],
          x: '-50%',
          y: '-50%',
          rotate: baseRotation + finalRotation,
          opacity: [0, 1, 1, 1],
          scale: [0.6, 1, 1],
        }}
        exit={{ opacity: 0, scale: 0.3 }}
        transition={{ duration, ease: motionEase }}
        style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}
      >
        {imgEl}
      </motion.div>
    )
  }

  return (
    <motion.div
      key={id}
      initial={{
        left: from.x,
        top: from.y,
        x: '-50%',
        y: '-50%',
        rotate: baseRotation + rotationStart,
        opacity: 0,
        scale: 0.5,
      }}
      animate={{
        left: to.x,
        top: to.y,
        x: '-50%',
        y: '-50%',
        rotate: baseRotation + finalRotation,
        opacity: 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ duration: durationSec, ease: motionEase }}
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}
    >
      {imgEl}
    </motion.div>
  )
}

function OrbProjectile({
  color,
  id,
  from,
  to,
  durationSec,
  acceleration = 0,
  rotationStart = 0,
  rotationEnd,
}: {
  color: string
  id: string | number
  from: ProjectilePos
  to: ProjectilePos
  durationSec: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
}) {
  const motionEase = getAccelerationEase(acceleration)
  const finalRotation = rotationEnd ?? rotationStart
  return (
    <motion.div
      key={id}
      initial={{ left: from.x, top: from.y, x: '-50%', y: '-50%', opacity: 0, scale: 0.5, rotate: rotationStart }}
      animate={{ left: to.x, top: to.y, x: '-50%', y: '-50%', opacity: 1, scale: 1, rotate: finalRotation }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ duration: durationSec, ease: motionEase }}
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <motion.circle
          cx="16" cy="16" r="8" fill={color}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        />
        <motion.circle cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="2" opacity={0.3} />
      </svg>
    </motion.div>
  )
}

const FALLBACK_FROM: ProjectilePos = { x: 100, y: 100 }
const FALLBACK_TO: ProjectilePos = { x: 300, y: 100 }

export default function Projectile({
  show,
  color,
  direction,
  id,
  weaponUrl,
  mirrored = false,
  acceleration = 0,
  rotationStart = 0,
  rotationEnd,
  trajectory,
  durationMs,
  sizePx,
  startSizePx,
  endSizePx,
  from,
  to,
}: Props) {
  const start = from ?? (direction === 'left-to-right' ? FALLBACK_FROM : FALLBACK_TO)
  const end = to ?? (direction === 'left-to-right' ? FALLBACK_TO : FALLBACK_FROM)
  const durationSec = durationMs != null ? durationMs / 1000 : PROJECTILE_SPEED

  return (
    <AnimatePresence>
      {show && (
        weaponUrl
          ? (
            <WeaponProjectile
              direction={direction}
              weaponUrl={weaponUrl}
              trajectory={trajectory ?? 'straight'}
              id={id}
              from={start}
              to={end}
              durationSec={durationSec}
              sizePx={sizePx}
              startSizePx={startSizePx}
              endSizePx={endSizePx}
              mirrored={mirrored}
              acceleration={acceleration}
              rotationStart={rotationStart}
              rotationEnd={rotationEnd}
            />
            )
          : (
            <OrbProjectile
              color={color}
              id={id}
              from={start}
              to={end}
              durationSec={durationSec}
              acceleration={acceleration}
              rotationStart={rotationStart}
              rotationEnd={rotationEnd}
            />
            )
      )}
    </AnimatePresence>
  )
}

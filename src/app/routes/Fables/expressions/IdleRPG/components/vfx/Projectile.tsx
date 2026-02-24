import { motion, AnimatePresence } from 'framer-motion'
import type { ProjectileType } from './animationConfig'

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
  trajectory?: ProjectileType
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
}: {
  direction: 'left-to-right' | 'right-to-left'
  weaponUrl: string
  trajectory: 'straight' | 'arc'
  id: string | number
  from: ProjectilePos
  to: ProjectilePos
}) {
  const baseRotate = tipRotation(direction)

  if (trajectory === 'arc') {
    const sign = direction === 'left-to-right' ? -1 : 1
    return (
      <motion.div
        key={id}
        initial={{
          left: from.x,
          top: from.y,
          x: '-50%',
          y: '-50%',
          rotate: baseRotate - 25 * sign,
          opacity: 0,
          scale: 0.6,
        }}
        animate={{
          left: to.x,
          top: [from.y, Math.min(from.y, to.y) + ARC_PEAK, to.y],
          x: '-50%',
          y: '-50%',
          rotate: [baseRotate + 35 * sign, baseRotate, baseRotate - 25 * sign],
          opacity: [0, 1, 1, 1],
          scale: [0.6, 1, 1],
        }}
        exit={{ opacity: 0, scale: 0.3 }}
        transition={{ duration: PROJECTILE_SPEED * 1.25, ease: 'easeInOut' }}
        style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}
      >
        <img
          src={weaponUrl}
          alt=""
          style={{ width: PROJECTILE_SIZE, height: PROJECTILE_SIZE, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
        />
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
        rotate: baseRotate,
        opacity: 0,
        scale: 0.5,
      }}
      animate={{
        left: to.x,
        top: to.y,
        x: '-50%',
        y: '-50%',
        rotate: baseRotate,
        opacity: 1,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ duration: PROJECTILE_SPEED, ease: 'easeIn' }}
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}
    >
      <img
        src={weaponUrl}
        alt=""
        style={{ width: PROJECTILE_SIZE, height: PROJECTILE_SIZE, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
      />
    </motion.div>
  )
}

function OrbProjectile({
  color,
  id,
  from,
  to,
}: {
  color: string
  id: string | number
  from: ProjectilePos
  to: ProjectilePos
}) {
  return (
    <motion.div
      key={id}
      initial={{ left: from.x, top: from.y, x: '-50%', y: '-50%', opacity: 0, scale: 0.5 }}
      animate={{ left: to.x, top: to.y, x: '-50%', y: '-50%', opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ duration: PROJECTILE_SPEED, ease: 'easeIn' }}
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

export default function Projectile({ show, color, direction, id, weaponUrl, trajectory, from, to }: Props) {
  const start = from ?? (direction === 'left-to-right' ? FALLBACK_FROM : FALLBACK_TO)
  const end = to ?? (direction === 'left-to-right' ? FALLBACK_TO : FALLBACK_FROM)

  return (
    <AnimatePresence>
      {show && (
        weaponUrl
          ? <WeaponProjectile direction={direction} weaponUrl={weaponUrl} trajectory={trajectory ?? 'straight'} id={id} from={start} to={end} />
          : <OrbProjectile color={color} id={id} from={start} to={end} />
      )}
    </AnimatePresence>
  )
}

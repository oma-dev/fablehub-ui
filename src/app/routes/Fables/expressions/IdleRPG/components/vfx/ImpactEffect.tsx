import { motion, AnimatePresence } from 'framer-motion'
import type { ImpactStyle } from './animationConfig'

interface Props {
  show: boolean
  style: ImpactStyle
  color: string
  id: string | number
}

function SlashSvg({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <motion.path
        d="M8 56L56 8"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2 }}
      />
      <motion.path
        d="M16 60L60 16"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.5 }}
        animate={{ pathLength: 1, opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      />
    </svg>
  )
}

function PunchSvg({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <motion.line
          key={angle}
          x1="32"
          y1="32"
          x2={32 + 24 * Math.cos((angle * Math.PI) / 180)}
          y2={32 + 24 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      ))}
    </svg>
  )
}

function FlailSvg({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      {/* Downward smash arcs */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={`arc-${i}`}
          d={`M${16 - i * 6},${32 + i * 6} Q32,${20 + i * 4} ${48 + i * 6},${32 + i * 6}`}
          stroke={color}
          strokeWidth={3 - i * 0.5}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0.9 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
        />
      ))}
      {/* Central crush dot */}
      <motion.circle
        cx="32"
        cy="28"
        r="5"
        fill={color}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.35 }}
      />
      {/* Debris lines radiating outward */}
      {[-40, -20, 0, 20, 40].map((angle) => {
        const rad = ((angle - 90) * Math.PI) / 180
        return (
          <motion.line
            key={`debris-${angle}`}
            x1={32 + 6 * Math.cos(rad)}
            y1={28 + 6 * Math.sin(rad)}
            x2={32 + 22 * Math.cos(rad)}
            y2={28 + 22 * Math.sin(rad)}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.8 }}
            animate={{ pathLength: 1, opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          />
        )
      })}
    </svg>
  )
}

function ArrowSvg({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <motion.polygon
        points="32,8 20,56 32,44 44,56"
        fill={color}
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.35 }}
      />
    </svg>
  )
}

function BoltSvg({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <motion.polygon
        points="28,4 16,32 28,28 20,60 48,24 32,28 40,4"
        fill={color}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 1.3, opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
    </svg>
  )
}

function GenericSvg({ color }: { color: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <motion.circle
        cx="32"
        cy="32"
        r="20"
        stroke={color}
        strokeWidth="3"
        fill="none"
        initial={{ scale: 0.3, opacity: 1 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.4 }}
      />
    </svg>
  )
}

const IMPACT_MAP: Record<ImpactStyle, React.FC<{ color: string }>> = {
  slash: SlashSvg,
  punch: PunchSvg,
  flail: FlailSvg,
  arrow: ArrowSvg,
  bolt: BoltSvg,
  generic: GenericSvg,
}

export default function ImpactEffect({ show, style, color, id }: Props) {
  const Component = IMPACT_MAP[style] ?? GenericSvg

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 1, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <Component color={color} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

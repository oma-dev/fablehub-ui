import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  show: boolean
  color: string
  direction: 'left-to-right' | 'right-to-left'
  id: string | number
}

export default function Projectile({ show, color, direction, id }: Props) {
  const startX = direction === 'left-to-right' ? -80 : 80
  const endX = 0

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ x: startX, opacity: 0, scale: 0.5 }}
          animate={{ x: endX, opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.35, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <motion.circle
              cx="16"
              cy="16"
              r="8"
              fill={color}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            />
            <motion.circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity={0.3}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { motion, AnimatePresence } from 'framer-motion'

const DAMAGE_SCALE = 3
const DAMAGE_FONT_SIZE = Math.round(22 * DAMAGE_SCALE)
const DAMAGE_TOP = -8 * DAMAGE_SCALE
const DAMAGE_FLIGHT_Y = -48 * DAMAGE_SCALE

interface Props {
  value: number
  type: 'damage' | 'heal'
  id: string | number
}

export default function DamageNumber({ value, type, id }: Props) {
  const color = type === 'damage' ? '#ef5350' : '#66bb6a'
  const prefix = type === 'damage' ? '-' : '+'

  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ opacity: 1, y: 0, scale: 0.5 }}
        animate={{ opacity: 0, y: DAMAGE_FLIGHT_Y, scale: 1.2 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: DAMAGE_TOP,
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 20,
          fontWeight: 900,
          fontSize: DAMAGE_FONT_SIZE,
          color,
          textShadow: '0 2px 6px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        {prefix}{value}
      </motion.div>
    </AnimatePresence>
  )
}

import { motion, AnimatePresence } from 'framer-motion'
import type { CombatEventType } from '../../../../../../../services/api'

const DAMAGE_SCALE = 3
const DAMAGE_FONT_SIZE = Math.round(22 * DAMAGE_SCALE)
const DAMAGE_TOP = -8 * DAMAGE_SCALE
const DAMAGE_FLIGHT_Y = -48 * DAMAGE_SCALE

interface Props {
  value: number
  type: CombatEventType
  id: string | number
  abilityName?: string
}

function getDisplayConfig(type: CombatEventType, value: number): { color: string; prefix: string; label?: string } {
  switch (type) {
    case 'heal':
    case 'hot_tick':
      return { color: '#66bb6a', prefix: '+' }
    case 'dot_tick':
      return { color: '#ce93d8', prefix: '-' }
    case 'stun_skip':
      return { color: '#ffa726', prefix: '', label: 'STUNNED' }
    case 'execute':
      return { color: '#ff1744', prefix: '', label: 'EXECUTED' }
    case 'status_applied':
      return { color: '#90caf9', prefix: '', label: '' }
    case 'status_expired':
      return { color: '#78909c', prefix: '', label: '' }
    case 'resource_change':
      return { color: '#4fc3f7', prefix: value >= 0 ? '+' : '' }
    case 'block':
      return { color: '#90caf9', prefix: '', label: 'BLOCKED!' }
    default:
      return { color: '#ef5350', prefix: '-' }
  }
}

export default function DamageNumber({ value, type, id, abilityName }: Props) {
  const { color, prefix, label } = getDisplayConfig(type, value)

  if (type === 'status_applied' || type === 'status_expired') return null

  const displayText = label || `${prefix}${value}`

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
          fontSize: label ? DAMAGE_FONT_SIZE * 0.7 : DAMAGE_FONT_SIZE,
          color,
          textShadow: '0 2px 6px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {abilityName && (
          <div style={{ fontSize: DAMAGE_FONT_SIZE * 0.35, marginBottom: -4, opacity: 0.85 }}>
            {abilityName}
          </div>
        )}
        {displayText}
      </motion.div>
    </AnimatePresence>
  )
}

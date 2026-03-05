import { motion, AnimatePresence } from 'framer-motion'
import type { CombatEventType } from '@features/idle-rpg/api'

const DAMAGE_SCALE = 3
const DAMAGE_FONT_SIZE = Math.round(22 * DAMAGE_SCALE)
const DAMAGE_TOP = -8 * DAMAGE_SCALE
const DAMAGE_FLIGHT_Y = -48 * DAMAGE_SCALE
const VFX_Z_INDEX_BASE = 2600

interface Props {
  value: number
  type: CombatEventType
  id: string | number
  abilityName?: string
  isCritical?: boolean
  stackIndex?: number
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
    default:
      return { color: '#ef5350', prefix: '-' }
  }
}

export default function DamageNumber({ value, type, id, abilityName, isCritical = false, stackIndex = 0 }: Props) {
  const { color, prefix, label } = getDisplayConfig(type, value)

  if (type === 'status_applied' || type === 'status_expired') return null

  const displayText = label || `${prefix}${value}`
  const showCriticalLabel = isCritical && !label
  const numberFontSize = showCriticalLabel
    ? DAMAGE_FONT_SIZE * 1.35
    : (label ? DAMAGE_FONT_SIZE * 0.7 : DAMAGE_FONT_SIZE)
  const popScale = showCriticalLabel ? 1.45 : 1.2
  const stackOffsetY = Math.max(0, stackIndex) * Math.round(DAMAGE_FONT_SIZE * 0.45)

  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ opacity: 1, y: 0, scale: showCriticalLabel ? 0.65 : 0.5 }}
        animate={{ opacity: 0, y: DAMAGE_FLIGHT_Y, scale: popScale }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: DAMAGE_TOP - stackOffsetY,
          left: 0,
          right: 0,
          width: 'fit-content',
          marginLeft: 'auto',
          marginRight: 'auto',
          pointerEvents: 'none',
          zIndex: VFX_Z_INDEX_BASE + stackIndex,
          fontWeight: 900,
          fontSize: numberFontSize,
          color,
          textShadow: '0 2px 6px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {showCriticalLabel && (
          <div style={{ fontSize: DAMAGE_FONT_SIZE * 1.5, marginBottom: -6, color: '#ffd54f' }}>
            CRITICAL DAMAGE!
          </div>
        )}
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

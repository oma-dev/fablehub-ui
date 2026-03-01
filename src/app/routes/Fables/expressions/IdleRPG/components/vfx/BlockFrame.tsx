import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT_SIZE = 140

interface Props {
  show: boolean
  url: string
  /** Which side the defender is on — determines which card border the block anchors to. */
  side: 'player' | 'creature'
  showMs?: number
  vanishMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  /** Horizontal offset from the card border (positive = inward). */
  offsetX?: number
  /** Vertical offset from portrait center (positive = down). */
  offsetY?: number
  id: string | number
}

/**
 * Block animation frame: positioned at the defender's card border (the edge facing the attacker).
 * Player card is on the left → block anchors at right edge.
 * Creature card is on the right → block anchors at left edge.
 */
export default function BlockFrame({ show, url, side, showMs = 100, vanishMs = 500, sizePx, startSizePx, endSizePx, offsetX = 0, offsetY = 0, id }: Props) {
  const totalSec = showMs / 1000 + vanishMs / 1000
  let fadeStart = showMs / 1000 / totalSec
  if (fadeStart < 0.08) fadeStart = 0.08
  const startSize = startSizePx ?? sizePx ?? DEFAULT_SIZE
  const endSize = endSizePx ?? sizePx ?? DEFAULT_SIZE
  const baseSize = Math.max(startSize, endSize, 1)
  const initialScale = startSize / baseSize
  const finalScale = endSize / baseSize

  const isPlayer = side === 'player'
  const anchor: React.CSSProperties = isPlayer
    ? { right: -baseSize / 2 + offsetX, top: '50%', marginTop: -baseSize / 2 + offsetY }
    : { left: -baseSize / 2 + offsetX, top: '50%', marginTop: -baseSize / 2 + offsetY }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: initialScale }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [initialScale, finalScale],
            transition: {
              opacity: {
                times: [0, 0.08, fadeStart, 1],
                duration: totalSec,
                ease: 'easeOut',
              },
              scale: { duration: totalSec, ease: 'easeOut' },
            },
          }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            ...anchor,
            width: baseSize,
            height: baseSize,
            pointerEvents: 'none',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.5))' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

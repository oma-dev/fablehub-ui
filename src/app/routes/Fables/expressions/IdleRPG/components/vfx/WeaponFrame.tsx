import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT_SIZE = 120

interface Props {
  show: boolean
  url: string
  /** Fade-in duration in ms */
  fadeInMs?: number
  /** Display size in px (single size, or fallback when start/end not both set). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over fadeInMs. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  id: string | number
}

export default function WeaponFrame({ show, url, fadeInMs = 200, sizePx, startSizePx, endSizePx, id }: Props) {
  const startSize = startSizePx ?? sizePx ?? DEFAULT_SIZE
  const endSize = endSizePx ?? sizePx ?? DEFAULT_SIZE
  const baseSize = Math.max(startSize, endSize, 1)
  const initialScale = startSize / baseSize
  const durationSec = fadeInMs / 1000

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: initialScale }}
          animate={{ opacity: 1, scale: endSize / baseSize }}
          exit={{ opacity: 0 }}
          transition={{ duration: durationSec, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: -baseSize / 2,
            marginLeft: -baseSize / 2,
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
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import type { CombatResult, CombatTurnEvent } from '../../../../../../services/api'
import { getAttackAnimation, type AttackAnimation } from './vfx/animationConfig'
import DamageNumber from './vfx/DamageNumber'
import ImpactEffect from './vfx/ImpactEffect'
import Projectile from './vfx/Projectile'

interface CombatantInfo {
  name: string
  level: number
  maxHp: number
  ap: number
  arm: number
  portraitUrl?: string | null
  styleId?: string
}

interface Props {
  combat: CombatResult
  player: CombatantInfo
  creature: CombatantInfo
  victory: boolean
  onFinish: () => void
}

interface LogEntry {
  turn: number
  text: string
}

const STAT_LABELS: { key: keyof Pick<CombatantInfo, 'ap' | 'arm'>; label: string }[] = [
  { key: 'ap', label: 'Attack' },
  { key: 'arm', label: 'Armor' },
]

function Portrait({ url }: { url?: string | null }) {
  return (
    <Box
      sx={{
        width: 110,
        height: 110,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      {url ? (
        <Box component="img" src={url} alt="portrait" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <PersonIcon sx={{ fontSize: 52, color: 'rgba(255,255,255,0.3)' }} />
      )}
    </Box>
  )
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const color = pct > 50 ? 'success' : pct > 25 ? 'warning' : 'error'
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>HP</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>{current} / {max}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 14, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.12)', transition: 'none',
          '& .MuiLinearProgress-bar': { transition: 'transform 0.4s ease-out' },
        }}
      />
    </Box>
  )
}

function getMotionVariants(anim: AttackAnimation, direction: 'left' | 'right') {
  const sign = direction === 'left' ? 1 : -1
  return {
    idle: { x: 0, scale: 1 },
    lunge: { x: sign * anim.lungeDistance, scale: 1.05, transition: { duration: 0.2, ease: [0.0, 0.0, 0.58, 1.0] as const } },
    cast: { scale: 1.08, transition: { duration: 0.15 } },
    hit: {
      x: [0, sign * -6, sign * 6, sign * -4, 0],
      transition: { duration: 0.3 },
    },
    return: { x: 0, scale: 1, transition: { duration: 0.25, ease: [0.42, 0.0, 0.58, 1.0] as const } },
  }
}

export default function CombatReplay({ combat, player, creature, victory, onFinish }: Props) {
  const [playerHp, setPlayerHp] = useState(player.maxHp)
  const [creatureHp, setCreatureHp] = useState(creature.maxHp)
  const [log, setLog] = useState<LogEntry[]>([])
  const [done, setDone] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(-1)
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)

  const playerId = combat.turns[0]?.events[0]?.sourceId ?? 'player'
  const nameOf = useCallback(
    (id: string) => (id === playerId ? player.name : creature.name),
    [playerId, player.name, creature.name],
  )

  // Animation state
  const [playerVariant, setPlayerVariant] = useState<string>('idle')
  const [creatureVariant, setCreatureVariant] = useState<string>('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [showProjectile, setShowProjectile] = useState<'left-to-right' | 'right-to-left' | null>(null)
  const [playerDmg, setPlayerDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const [creatureDmg, setCreatureDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const dmgKeyRef = useRef(0)

  const playerAnim = getAttackAnimation(player.styleId)
  const creatureAnim = getAttackAnimation(creature.styleId)
  const playerVariants = getMotionVariants(playerAnim, 'left')
  const creatureVariants = getMotionVariants(creatureAnim, 'right')

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const animateAttack = useCallback(async (
    attackerSide: 'player' | 'creature',
    event: CombatTurnEvent,
    anim: AttackAnimation,
  ) => {
    if (abortRef.current) return
    const setAttackerVariant = attackerSide === 'player' ? setPlayerVariant : setCreatureVariant
    const setTargetImpact = attackerSide === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTargetDmg = attackerSide === 'player' ? setCreatureDmg : setPlayerDmg
    const setTargetHp = event.targetId === playerId ? setPlayerHp : setCreatureHp
    const setTargetVariant = attackerSide === 'player' ? setCreatureVariant : setPlayerVariant

    // 1. Attacker motion
    if (anim.casterMotion === 'lunge') {
      setAttackerVariant('lunge')
      await sleep(220)
    } else if (anim.casterMotion === 'cast') {
      setAttackerVariant('cast')
      await sleep(160)
    }

    // 2. Projectile (if applicable)
    if (anim.projectile) {
      const dir = attackerSide === 'player' ? 'left-to-right' : 'right-to-left'
      setShowProjectile(dir)
      await sleep(350)
      setShowProjectile(null)
    }

    if (abortRef.current) return

    // 3. Impact on target
    setTargetImpact(true)
    setTargetVariant('hit')
    dmgKeyRef.current++
    setTargetDmg({ value: event.value, type: event.type, key: dmgKeyRef.current })
    setTargetHp(Math.max(0, event.targetHpAfter))
    await sleep(350)

    // 4. Clear effects
    setTargetImpact(false)
    setAttackerVariant('return')
    setTargetVariant('idle')
    await sleep(280)

    setAttackerVariant('idle')
    setTargetDmg(null)
  }, [playerId])

  // Turn-by-turn playback
  useEffect(() => {
    if (combat.turns.length === 0) {
      setDone(true)
      return
    }
    abortRef.current = false

    const playTurns = async () => {
      await sleep(600)
      for (let i = 0; i < combat.turns.length; i++) {
        if (abortRef.current) return
        const turn = combat.turns[i]
        setCurrentTurn(turn.turnIndex)

        for (const ev of turn.events) {
          if (abortRef.current) return
          const attackerSide = ev.sourceId === playerId ? 'player' : 'creature'
          const anim = attackerSide === 'player' ? playerAnim : creatureAnim

          await animateAttack(attackerSide, ev, anim)

          const verb = ev.type === 'damage' ? 'deals' : 'heals'
          setLog((prev) => [
            ...prev,
            {
              turn: turn.turnIndex,
              text: `${nameOf(ev.sourceId)} ${verb} ${ev.value} to ${nameOf(ev.targetId)} (HP: ${Math.max(0, ev.targetHpAfter)})`,
            },
          ])
        }
        if (!abortRef.current) await sleep(300)
      }
      if (!abortRef.current) setDone(true)
    }

    playTurns()
    return () => { abortRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const handleSkip = () => {
    abortRef.current = true
    setPlayerVariant('idle')
    setCreatureVariant('idle')
    setShowPlayerImpact(false)
    setShowCreatureImpact(false)
    setShowProjectile(null)
    setPlayerDmg(null)
    setCreatureDmg(null)

    const entries: LogEntry[] = []
    let pHp = player.maxHp
    let cHp = creature.maxHp
    for (const turn of combat.turns) {
      for (const ev of turn.events) {
        if (ev.targetId === playerId) pHp = Math.max(0, ev.targetHpAfter)
        else cHp = Math.max(0, ev.targetHpAfter)
        entries.push({
          turn: turn.turnIndex,
          text: `${nameOf(ev.sourceId)} ${ev.type === 'damage' ? 'deals' : 'heals'} ${ev.value} to ${nameOf(ev.targetId)} (HP: ${Math.max(0, ev.targetHpAfter)})`,
        })
      }
    }
    setPlayerHp(pHp)
    setCreatureHp(cHp)
    setLog(entries)
    setCurrentTurn(combat.turns[combat.turns.length - 1]?.turnIndex ?? 0)
    setDone(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>

      {currentTurn >= 0 && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Turn {currentTurn + 1} / {combat.turns.length}
        </Typography>
      )}

      {/* Arena */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'flex-start', position: 'relative' }}>

        {/* Player card */}
        <motion.div
          variants={playerVariants}
          animate={playerVariant}
          style={{ flex: 1, maxWidth: 280, position: 'relative' }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1, p: 2, borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(33,150,243,0.06) 0%, rgba(33,150,243,0.02) 100%)',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Portrait url={player.portraitUrl} />
              <ImpactEffect
                show={showPlayerImpact}
                style={creatureAnim.impactStyle}
                color={creatureAnim.impactColor}
                id={`p-impact-${dmgKeyRef.current}`}
              />
              <AnimatePresence>
                {playerDmg && (
                  <DamageNumber value={playerDmg.value} type={playerDmg.type} id={playerDmg.key} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>{player.name}</Typography>
              <Typography variant="caption" color="text.secondary">Level {player.level}</Typography>
            </Box>
            <HpBar current={playerHp} max={player.maxHp} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{player[key]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </motion.div>

        {/* Center: VS + projectile zone */}
        <Box sx={{ alignSelf: 'center', position: 'relative', width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography variant="h4" fontWeight={900} color="text.disabled" sx={{ userSelect: 'none' }}>
            VS
          </Typography>
          <AnimatePresence>
            {showProjectile && (
              <Projectile
                show
                color={showProjectile === 'left-to-right' ? playerAnim.impactColor : creatureAnim.impactColor}
                direction={showProjectile}
                id={`proj-${dmgKeyRef.current}`}
              />
            )}
          </AnimatePresence>
        </Box>

        {/* Creature card */}
        <motion.div
          variants={creatureVariants}
          animate={creatureVariant}
          style={{ flex: 1, maxWidth: 280, position: 'relative' }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1, p: 2, borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(244,67,54,0.06) 0%, rgba(244,67,54,0.02) 100%)',
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Portrait url={creature.portraitUrl} />
              <ImpactEffect
                show={showCreatureImpact}
                style={playerAnim.impactStyle}
                color={playerAnim.impactColor}
                id={`c-impact-${dmgKeyRef.current}`}
              />
              <AnimatePresence>
                {creatureDmg && (
                  <DamageNumber value={creatureDmg.value} type={creatureDmg.type} id={creatureDmg.key} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>{creature.name}</Typography>
              <Typography variant="caption" color="text.secondary">Level {creature.level}</Typography>
            </Box>
            <HpBar current={creatureHp} max={creature.maxHp} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>{creature[key]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </motion.div>
      </Box>

      {/* Skip */}
      {!done && (
        <Box sx={{ textAlign: 'center' }}>
          <Button variant="outlined" size="small" onClick={handleSkip}>Skip</Button>
        </Box>
      )}

      {/* Battle log */}
      <Paper
        variant="outlined"
        ref={logRef}
        sx={{ flex: 1, minHeight: 100, maxHeight: 200, overflow: 'auto', p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}
      >
        <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ fontSize: 12 }}>Battle Log</Typography>
        {log.length === 0 && (
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: 12 }}>Combat starting...</Typography>
        )}
        {log.map((entry, i) => (
          <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }}>
            <strong>T{entry.turn + 1}:</strong> {entry.text}
          </Typography>
        ))}
      </Paper>

      {/* Result */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', paddingBottom: 8 }}
          >
            <Typography variant="h5" fontWeight={800} color={victory ? 'success.main' : 'error.main'} gutterBottom>
              {victory ? 'Victory!' : 'Defeat'}
            </Typography>
            <Button variant="contained" color="primary" onClick={onFinish}>Continue</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

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
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from './vfx/Projectile'

interface CombatantInfo {
  name: string
  level: number
  maxHp: number
  ap: number
  arm: number
  portraitUrl?: string | null
  styleId?: string
  weaponUrl?: string | null
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

function Portrait({ url, weaponUrl }: { url?: string | null; weaponUrl?: string | null }) {
  return (
    <Box sx={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      <Box
        sx={{
          width: 120,
          height: 120,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'rgba(168,85,247,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(168,85,247,0.2)',
          boxShadow: '0 0 16px rgba(168,85,247,0.1)',
        }}
      >
        {url ? (
          <Box component="img" src={url} alt="portrait" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <PersonIcon sx={{ fontSize: 60, color: 'rgba(168,85,247,0.25)' }} />
        )}
      </Box>
      {weaponUrl && (
        <Box
          component="img"
          src={weaponUrl}
          alt="weapon"
          sx={{
            position: 'absolute',
            bottom: -18,
            right: -18,
            width: 44,
            height: 44,
            objectFit: 'contain',
            borderRadius: '50%',
            border: '2px solid rgba(245,158,11,0.5)',
            bgcolor: '#14121f',
            boxShadow: '0 0 10px rgba(245,158,11,0.2)',
            zIndex: 5,
          }}
        />
      )}
    </Box>
  )
}

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const grad = pct > 50
    ? 'linear-gradient(90deg, #4ade80, #22c55e)'
    : pct > 25
      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
      : 'linear-gradient(90deg, #f87171, #ef4444)'
  const glowColor = pct > 50 ? 'rgba(34,197,94,0.3)' : pct > 25 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 12 }}>HP</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: 12 }}>{current} / {max}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 16,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(168,85,247,0.1)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: 2,
            background: grad,
            boxShadow: `0 0 10px ${glowColor}`,
          },
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
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)

  const playerId = combat.turns[0]?.events[0]?.sourceId ?? 'player'
  const nameOf = useCallback(
    (id: string) => (id === playerId ? player.name : creature.name),
    [playerId, player.name, creature.name],
  )

  const [playerVariant, setPlayerVariant] = useState<string>('idle')
  const [creatureVariant, setCreatureVariant] = useState<string>('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [showProjectile, setShowProjectile] = useState<'left-to-right' | 'right-to-left' | null>(null)
  const [projectileAttacker, setProjectileAttacker] = useState<'player' | 'creature'>('player')
  const [projFrom, setProjFrom] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projTo, setProjTo] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [playerDmg, setPlayerDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const [creatureDmg, setCreatureDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const dmgKeyRef = useRef(0)

  const playerAnim = getAttackAnimation(player.styleId)
  const creatureAnim = getAttackAnimation(creature.styleId)
  const playerVariants = getMotionVariants(playerAnim, 'left')
  const creatureVariants = getMotionVariants(creatureAnim, 'right')

  const getPortraitPos = useCallback((ref: React.RefObject<HTMLDivElement | null>): ProjectilePos => {
    const arena = arenaRef.current
    const el = ref.current
    if (!arena || !el) return { x: 0, y: 0 }
    const aRect = arena.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    return {
      x: eRect.left + eRect.width / 2 - aRect.left,
      y: eRect.top + eRect.height / 2 - aRect.top,
    }
  }, [])

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

    if (anim.casterMotion === 'lunge') {
      setAttackerVariant('lunge')
      await sleep(220)
    } else if (anim.casterMotion === 'cast') {
      setAttackerVariant('cast')
      await sleep(160)
    }

    if (anim.projectile) {
      const dir = attackerSide === 'player' ? 'left-to-right' : 'right-to-left'
      const srcRef = attackerSide === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = attackerSide === 'player' ? creaturePortraitRef : playerPortraitRef
      setProjFrom(getPortraitPos(srcRef))
      setProjTo(getPortraitPos(tgtRef))
      setProjectileAttacker(attackerSide)
      setShowProjectile(dir)
      const flightMs = (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
      await sleep(flightMs)
      setShowProjectile(null)
    }

    if (abortRef.current) return

    setTargetImpact(true)
    setTargetVariant('hit')
    dmgKeyRef.current++
    setTargetDmg({ value: event.value, type: event.type, key: dmgKeyRef.current })
    setTargetHp(Math.max(0, event.targetHpAfter))
    await sleep(350)

    setTargetImpact(false)
    setAttackerVariant('return')
    setTargetVariant('idle')
    await sleep(280)

    setAttackerVariant('idle')
    setTargetDmg(null)
  }, [playerId])

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
    setProjectileAttacker('player')
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>

      {currentTurn >= 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" fontWeight={600}>
          Turn {currentTurn + 1} / {combat.turns.length}
        </Typography>
      )}

      {/* Arena */}
      <Box ref={arenaRef} sx={{ display: 'flex', gap: 3, justifyContent: 'center', alignItems: 'flex-start', position: 'relative' }}>

        {/* Projectile layer */}
        <AnimatePresence>
          {showProjectile && (
            <Projectile
              show
              color={showProjectile === 'left-to-right' ? playerAnim.impactColor : creatureAnim.impactColor}
              direction={showProjectile}
              id={`proj-${dmgKeyRef.current}`}
              weaponUrl={projectileAttacker === 'player' ? player.weaponUrl : creature.weaponUrl}
              trajectory={projectileAttacker === 'player' ? playerAnim.projectile : creatureAnim.projectile}
              from={projFrom}
              to={projTo}
            />
          )}
        </AnimatePresence>

        {/* Player card */}
        <motion.div
          variants={playerVariants}
          animate={playerVariant}
          style={{ flex: 1, maxWidth: 300, position: 'relative' }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1.5, p: 2.5, borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(20,18,31,0.9) 100%)',
              borderColor: 'rgba(99,102,241,0.2)',
              boxShadow: '0 0 20px rgba(99,102,241,0.08)',
            }}
          >
            <Box ref={playerPortraitRef} sx={{ position: 'relative' }}>
              <Portrait url={player.portraitUrl} weaponUrl={player.weaponUrl} />
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
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: '1.1rem' }}>{player.name}</Typography>
              <Typography variant="body2" color="text.secondary">Level {player.level}</Typography>
            </Box>
            <HpBar current={playerHp} max={player.maxHp} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>{player[key]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </motion.div>

        {/* Center: VS label */}
        <Box sx={{ alignSelf: 'center', position: 'relative', width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              userSelect: 'none',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(99,102,241,0.3))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            VS
          </Typography>
        </Box>

        {/* Creature card */}
        <motion.div
          variants={creatureVariants}
          animate={creatureVariant}
          style={{ flex: 1, maxWidth: 300, position: 'relative' }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1.5, p: 2.5, borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(20,18,31,0.9) 100%)',
              borderColor: 'rgba(239,68,68,0.15)',
              boxShadow: '0 0 20px rgba(239,68,68,0.05)',
            }}
          >
            <Box ref={creaturePortraitRef} sx={{ position: 'relative' }}>
              <Portrait url={creature.portraitUrl} weaponUrl={creature.weaponUrl} />
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
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: '1.1rem' }}>{creature.name}</Typography>
              <Typography variant="body2" color="text.secondary">Level {creature.level}</Typography>
            </Box>
            <HpBar current={creatureHp} max={creature.maxHp} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: 13 }}>{creature[key]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </motion.div>
      </Box>

      {/* Skip */}
      {!done && (
        <Box sx={{ textAlign: 'center' }}>
          <Button variant="outlined" size="medium" onClick={handleSkip} color="primary">Skip</Button>
        </Box>
      )}

      {/* Battle log */}
      <Paper
        variant="outlined"
        ref={logRef}
        sx={{
          flex: 1,
          minHeight: 100,
          maxHeight: 220,
          overflow: 'auto',
          p: 2,
          borderRadius: 2.5,
          background: 'rgba(12,10,20,0.6)',
          borderColor: 'rgba(168,85,247,0.12)',
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={700}
          gutterBottom
          sx={{
            fontSize: 13,
            background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Battle Log
        </Typography>
        {log.length === 0 && (
          <Typography variant="body2" color="text.disabled" sx={{ fontSize: 13 }}>Combat starting...</Typography>
        )}
        {log.map((entry, i) => (
          <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, color: 'text.secondary' }}>
            <Box component="strong" sx={{ color: 'text.primary' }}>T{entry.turn + 1}:</Box> {entry.text}
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
            style={{ textAlign: 'center', paddingBottom: 12 }}
          >
            <Typography
              variant="h4"
              fontWeight={900}
              gutterBottom
              sx={{
                background: victory
                  ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                  : 'linear-gradient(135deg, #f87171, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {victory ? 'Victory!' : 'Defeat'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={onFinish}
              size="large"
              sx={{ px: 5, py: 1.5, fontSize: '1.1rem' }}
            >
              Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

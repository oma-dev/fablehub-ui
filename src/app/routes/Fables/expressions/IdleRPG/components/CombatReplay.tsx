import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import type { AnimationFrames, CombatResult, CombatTurnEvent } from '../../../../../../services/api'
import { getAttackAnimationConfig, type AttackAnimationConfig } from './vfx/animationConfig'
import DamageNumber from './vfx/DamageNumber'
import ImpactEffect from './vfx/ImpactEffect'
import ImpactFrame from './vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from './vfx/Projectile'
import WeaponFrame from './vfx/WeaponFrame'

interface CombatantInfo {
  name: string
  level: number
  maxHp: number
  ap: number
  arm: number
  portraitUrl?: string | null
  styleId?: string
  /** Weapon icon URL for portrait overlay and fallback projectile image when ability has no frame URL. */
  weaponUrl?: string | null
  /** Pre-resolved animation frames (Ability + weapon URLs already resolved by caller). */
  animationFrames?: AnimationFrames | null
}

interface Props {
  combat: CombatResult
  player: CombatantInfo
  creature: CombatantInfo
  victory: boolean
  onFinish: () => void
  /** When provided (e.g. PvP), use this as the left-side combatant ID. Otherwise derived from first event. */
  leftCharacterId?: string
}

const STAT_LABELS: { key: keyof Pick<CombatantInfo, 'ap' | 'arm'>; label: string }[] = [
  { key: 'ap', label: 'Attack' },
  { key: 'arm', label: 'Armor' },
]

const SCALE = 1.2
const PORTRAIT_SIZE = Math.round(380 * SCALE)  // 300
const PORTRAIT_BORDER_RADIUS = 3 * SCALE
const PORTRAIT_BORDER = Math.round(3 * SCALE)
const WEAPON_SIZE = Math.round(56 * SCALE)
const WEAPON_OFFSET = Math.round(-24 * SCALE)
const PERSON_ICON_SIZE = Math.round(100 * SCALE)
const HP_FONT_SIZE = Math.round(12 * SCALE)
const HP_BAR_HEIGHT = Math.round(16 * SCALE)
const HP_BAR_RADIUS = 2 * SCALE
const STAT_FONT_SIZE = Math.round(13 * SCALE)
const NAME_FONT_SIZE = `${1.1 * SCALE}rem`
const LEVEL_FONT_SIZE = `${0.875 * SCALE}rem`
const CARD_GAP = 1.5 * SCALE
const CARD_PADDING = 2.5 * SCALE
const CARD_RADIUS = 3 * SCALE
const CARD_MAX_WIDTH = Math.round(380 * SCALE)
const VS_WIDTH = Math.round(70 * SCALE)
const TURN_FONT_SIZE = Math.round(14 * SCALE)
const RESULT_FONT_SIZE = `${1.5 * SCALE}rem`
const BUTTON_FONT_SIZE = `${1.1 * SCALE}rem`

function Portrait({ url, weaponUrl }: { url?: string | null; weaponUrl?: string | null }) {
  return (
    <Box sx={{ position: 'relative', width: PORTRAIT_SIZE, height: PORTRAIT_SIZE, flexShrink: 0 }}>
      <Box
        sx={{
          width: PORTRAIT_SIZE,
          height: PORTRAIT_SIZE,
          borderRadius: PORTRAIT_BORDER_RADIUS,
          overflow: 'hidden',
          bgcolor: '#14121f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `${PORTRAIT_BORDER}px solid rgba(168,85,247,0.35)`,
          boxShadow: '0 0 36px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {url ? (
          <Box component="img" src={url} alt="portrait" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <PersonIcon sx={{ fontSize: PERSON_ICON_SIZE, color: 'rgba(168,85,247,0.25)' }} />
        )}
      </Box>
      {weaponUrl && (
        <Box
          component="img"
          src={weaponUrl}
          alt="weapon"
          sx={{
            position: 'absolute',
            bottom: WEAPON_OFFSET,
            right: WEAPON_OFFSET,
            width: WEAPON_SIZE,
            height: WEAPON_SIZE,
            objectFit: 'contain',
            borderRadius: '50%',
            border: '2px solid rgba(245,158,11,0.5)',
            bgcolor: '#14121f',
            boxShadow: '0 0 12px rgba(245,158,11,0.2)',
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE }}>HP</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE }}>{current} / {max}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: HP_BAR_HEIGHT,
          borderRadius: HP_BAR_RADIUS,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(168,85,247,0.1)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: HP_BAR_RADIUS,
            background: grad,
            boxShadow: `0 0 10px ${glowColor}`,
          },
        }}
      />
    </Box>
  )
}

function getMotionVariants(_anim: AttackAnimationConfig, direction: 'left' | 'right') {
  const sign = direction === 'left' ? 1 : -1
  return {
    idle: { x: 0, scale: 1 },
    cast: { scale: 1.08, transition: { duration: 0.15 } },
    hit: {
      x: [0, sign * -6, sign * 6, sign * -4, 0],
      transition: { duration: 0.3 },
    },
    return: { x: 0, scale: 1, transition: { duration: 0.25, ease: [0.42, 0.0, 0.58, 1.0] as const } },
  }
}

export default function CombatReplay({ combat, player, creature, victory, onFinish, leftCharacterId }: Props) {
  const [playerHp, setPlayerHp] = useState(player.maxHp)
  const [creatureHp, setCreatureHp] = useState(creature.maxHp)
  const [done, setDone] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(-1)
  const abortRef = useRef(false)
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)

  const playerId = leftCharacterId ?? combat.turns[0]?.events[0]?.sourceId ?? 'player'

  const [playerVariant, setPlayerVariant] = useState<string>('idle')
  const [creatureVariant, setCreatureVariant] = useState<string>('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [showProjectile, setShowProjectile] = useState<'left-to-right' | 'right-to-left' | null>(null)
  const [projectileAttacker, setProjectileAttacker] = useState<'player' | 'creature'>('player')
  const [projFrom, setProjFrom] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projTo, setProjTo] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projectileImageUrl, setProjectileImageUrl] = useState<string | null>(null)
  const [projectileDurationMs, setProjectileDurationMs] = useState<number | undefined>(undefined)
  const [showWeaponFrame, setShowWeaponFrame] = useState<'player' | 'creature' | null>(null)
  const [weaponFrameConfig, setWeaponFrameConfig] = useState<{ url: string; fadeInMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number } | null>(null)
  const [impactFrameConfig, setImpactFrameConfig] = useState<{ url: string; showMs: number; vanishMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number } | null>(null)
  const [projectileSizePx, setProjectileSizePx] = useState<number | undefined>(undefined)
  const [projectileStartSizePx, setProjectileStartSizePx] = useState<number | undefined>(undefined)
  const [projectileEndSizePx, setProjectileEndSizePx] = useState<number | undefined>(undefined)
  const [playerDmg, setPlayerDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const [creatureDmg, setCreatureDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const dmgKeyRef = useRef(0)

  const playerAnim = getAttackAnimationConfig(player.styleId, player.animationFrames)
  const creatureAnim = getAttackAnimationConfig(creature.styleId, creature.animationFrames)
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
    anim: AttackAnimationConfig,
  ) => {
    if (abortRef.current) return
    const setAttackerVariant = attackerSide === 'player' ? setPlayerVariant : setCreatureVariant
    const setTargetImpact = attackerSide === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTargetDmg = attackerSide === 'player' ? setCreatureDmg : setPlayerDmg
    const setTargetHp = event.targetId === playerId ? setPlayerHp : setCreatureHp
    const setTargetVariant = attackerSide === 'player' ? setCreatureVariant : setPlayerVariant
    const frames = anim.frames

    setAttackerVariant('cast')
    await sleep(160)

    const weaponFrameUrl = frames?.weapon?.url?.trim()
    if (frames?.weapon && weaponFrameUrl) {
      setWeaponFrameConfig({ url: weaponFrameUrl, fadeInMs: frames.weapon.fadeInMs ?? 200, sizePx: frames.weapon.sizePx, startSizePx: frames.weapon.startSizePx, endSizePx: frames.weapon.endSizePx })
      setShowWeaponFrame(attackerSide)
      await sleep(frames.weapon.fadeInMs ?? 200)
    }

    if (anim.projectile) {
      const dir = attackerSide === 'player' ? 'left-to-right' : 'right-to-left'
      const srcRef = attackerSide === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = attackerSide === 'player' ? creaturePortraitRef : playerPortraitRef
      setProjFrom(getPortraitPos(srcRef))
      setProjTo(getPortraitPos(tgtRef))
      setProjectileAttacker(attackerSide)
      const weaponUrlFallback = attackerSide === 'player' ? player.weaponUrl : creature.weaponUrl
      const projUrl = (frames?.projectile?.url?.trim()) ?? weaponUrlFallback ?? null
      const projDurationMs = frames?.projectile?.speedMs
      setProjectileImageUrl(projUrl)
      setProjectileDurationMs(projDurationMs)
      setProjectileSizePx(frames?.projectile?.sizePx)
      setProjectileStartSizePx(frames?.projectile?.startSizePx)
      setProjectileEndSizePx(frames?.projectile?.endSizePx)
      setShowProjectile(dir)
      const flightMs = projDurationMs ?? (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
      await sleep(flightMs)
      setShowProjectile(null)
    }

    if (abortRef.current) return

    const impactUrl = frames?.impact?.url?.trim()
    if (frames?.impact && impactUrl) {
      setImpactFrameConfig({
        url: impactUrl,
        showMs: frames.impact.showMs ?? 100,
        vanishMs: frames.impact.vanishMs ?? 500,
        sizePx: frames.impact.sizePx,
        startSizePx: frames.impact.startSizePx,
        endSizePx: frames.impact.endSizePx,
      })
    }
    setTargetImpact(true)
    setTargetVariant('hit')
    dmgKeyRef.current++
    setTargetDmg({ value: event.value, type: event.type, key: dmgKeyRef.current })
    setTargetHp(Math.max(0, event.targetHpAfter))
    const impactDuration = frames?.impact
      ? (frames.impact.showMs ?? 100) + (frames.impact.vanishMs ?? 500)
      : 350
    await sleep(impactDuration)

    setShowWeaponFrame(null)
    setWeaponFrameConfig(null)
    setImpactFrameConfig(null)
    setProjectileSizePx(undefined)
    setProjectileStartSizePx(undefined)
    setProjectileEndSizePx(undefined)
    setTargetImpact(false)
    setAttackerVariant('return')
    setTargetVariant('idle')
    await sleep(280)

    setAttackerVariant('idle')
    setTargetDmg(null)
  }, [playerId, player.weaponUrl, creature.weaponUrl])

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
        }
        if (!abortRef.current) await sleep(300)
      }
      if (!abortRef.current) setDone(true)
    }

    playTurns()
    return () => { abortRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSkip = () => {
    abortRef.current = true
    setPlayerVariant('idle')
    setCreatureVariant('idle')
    setShowPlayerImpact(false)
    setShowCreatureImpact(false)
    setShowProjectile(null)
    setProjectileAttacker('player')
    setShowWeaponFrame(null)
    setWeaponFrameConfig(null)
    setImpactFrameConfig(null)
    setProjectileSizePx(undefined)
    setProjectileStartSizePx(undefined)
    setProjectileEndSizePx(undefined)
    setPlayerDmg(null)
    setCreatureDmg(null)

    let pHp = player.maxHp
    let cHp = creature.maxHp
    for (const turn of combat.turns) {
      for (const ev of turn.events) {
        if (ev.targetId === playerId) pHp = Math.max(0, ev.targetHpAfter)
        else cHp = Math.max(0, ev.targetHpAfter)
      }
    }
    setPlayerHp(pHp)
    setCreatureHp(cHp)
    setCurrentTurn(combat.turns[combat.turns.length - 1]?.turnIndex ?? 0)
    setDone(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>

      {currentTurn >= 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" fontWeight={600} sx={{ fontSize: TURN_FONT_SIZE }}>
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
              weaponUrl={projectileImageUrl ?? (projectileAttacker === 'player' ? player.weaponUrl : creature.weaponUrl)}
              trajectory={projectileAttacker === 'player' ? playerAnim.projectile : creatureAnim.projectile}
              durationMs={projectileDurationMs}
              sizePx={projectileSizePx}
              startSizePx={projectileStartSizePx}
              endSizePx={projectileEndSizePx}
              from={projFrom}
              to={projTo}
            />
          )}
        </AnimatePresence>

        {/* Player card */}
        <motion.div
          variants={playerVariants}
          animate={playerVariant}
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: CARD_GAP, p: CARD_PADDING, pt: 0, borderRadius: CARD_RADIUS,
              bgcolor: '#14121f',
              borderColor: 'rgba(99,102,241,0.45)',
              boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.12)',
            }}
          >
            <Box ref={playerPortraitRef} sx={{ position: 'relative' }}>
              <Portrait url={player.portraitUrl} weaponUrl={player.weaponUrl} />
              {showWeaponFrame === 'player' && weaponFrameConfig && (
                <WeaponFrame show url={weaponFrameConfig.url} fadeInMs={weaponFrameConfig.fadeInMs} sizePx={weaponFrameConfig.sizePx} startSizePx={weaponFrameConfig.startSizePx} endSizePx={weaponFrameConfig.endSizePx} id="player-weapon" />
              )}
              {showPlayerImpact && impactFrameConfig ? (
                <ImpactFrame
                  show
                  url={impactFrameConfig.url}
                  showMs={impactFrameConfig.showMs}
                  vanishMs={impactFrameConfig.vanishMs}
                  sizePx={impactFrameConfig.sizePx}
                  startSizePx={impactFrameConfig.startSizePx}
                  endSizePx={impactFrameConfig.endSizePx}
                  id={`p-impact-${dmgKeyRef.current}`}
                />
              ) : (
                <ImpactEffect
                  show={showPlayerImpact}
                  style={'generic' as const}
                  color={creatureAnim.impactColor}
                  id={`p-impact-${dmgKeyRef.current}`}
                />
              )}
              <AnimatePresence>
                {playerDmg && (
                  <DamageNumber value={playerDmg.value} type={playerDmg.type} id={playerDmg.key} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{player.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {player.level}</Typography>
            </Box>
            <HpBar current={playerHp} max={player.maxHp} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{player[key]}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </motion.div>

        {/* Center: VS label */}
        <Box sx={{ alignSelf: 'center', position: 'relative', width: VS_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              fontSize: `${2 * SCALE}rem`,
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
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
        >
          <Paper
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: CARD_GAP, p: CARD_PADDING, pt: 0 ,borderRadius: CARD_RADIUS,
              bgcolor: '#1a1414',
              borderColor: 'rgba(239,68,68,0.4)',
              boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.1)',
            }}
          >
            <Box ref={creaturePortraitRef} sx={{ position: 'relative' }}>
              <Portrait url={creature.portraitUrl} weaponUrl={creature.weaponUrl} />
              {showWeaponFrame === 'creature' && weaponFrameConfig && (
                <WeaponFrame show url={weaponFrameConfig.url} fadeInMs={weaponFrameConfig.fadeInMs} sizePx={weaponFrameConfig.sizePx} startSizePx={weaponFrameConfig.startSizePx} endSizePx={weaponFrameConfig.endSizePx} id="creature-weapon" />
              )}
              {showCreatureImpact && impactFrameConfig ? (
                <ImpactFrame
                  show
                  url={impactFrameConfig.url}
                  showMs={impactFrameConfig.showMs}
                  vanishMs={impactFrameConfig.vanishMs}
                  sizePx={impactFrameConfig.sizePx}
                  startSizePx={impactFrameConfig.startSizePx}
                  endSizePx={impactFrameConfig.endSizePx}
                  id={`c-impact-${dmgKeyRef.current}`}
                />
              ) : (
                <ImpactEffect
                  show={showCreatureImpact}
                  style={'generic' as const}
                  color={playerAnim.impactColor}
                  id={`c-impact-${dmgKeyRef.current}`}
                />
              )}
              <AnimatePresence>
                {creatureDmg && (
                  <DamageNumber value={creatureDmg.value} type={creatureDmg.type} id={creatureDmg.key} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{creature.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {creature.level}</Typography>
            </Box>
            <HpBar current={creatureHp} max={creature.maxHp} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{creature[key]}</Typography>
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
                fontSize: RESULT_FONT_SIZE,
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
              sx={{ px: 5, py: 1.5, fontSize: BUTTON_FONT_SIZE }}
            >
              Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

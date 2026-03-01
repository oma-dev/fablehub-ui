import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import type { ActiveStatusEffect, AnimationFrames, CombatEventType, CombatResult, CombatTurnEvent } from '../../../../../../services/api'
import charBackground from '../../../../../../assets/backgrounds/charBackground.png'
import { getAttackAnimationConfig, type AttackAnimationConfig, type AnimationBlockFrame } from './vfx/animationConfig'
import BlockFrame from './vfx/BlockFrame'
import DamageNumber from './vfx/DamageNumber'
import ImpactEffect from './vfx/ImpactEffect'
import ImpactFrame from './vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from './vfx/Projectile'
import WeaponFrame from './vfx/WeaponFrame'

interface ResourceInfo {
  name: string
  colorHex: string
  max: number
  isGenerative: boolean
}

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
  /** Optional resource (mana, rage, etc.) to display below HP bar. */
  resource?: ResourceInfo | null
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
          backgroundImage: `url(${charBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `${PORTRAIT_BORDER}px solid rgba(168,85,247,0.35)`,
          boxShadow: '0 0 36px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {url ? (
          <Box component="img" src={url} alt="portrait" sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.6)) drop-shadow(0 0 20px rgba(168,85,247,0.3))' }} />
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

function ResourceBar({ current, max, name, colorHex }: { current: number; max: number; name: string; colorHex: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const color = colorHex.startsWith('#') ? colorHex : `#${colorHex}`
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE, color }}>{name}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE }}>{current} / {max}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: HP_BAR_HEIGHT,
          borderRadius: HP_BAR_RADIUS,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: HP_BAR_RADIUS,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 10px ${color}55`,
          },
        }}
      />
    </Box>
  )
}

const STATUS_ICON_SIZE = 24
const STATUS_EFFECT_COLORS: Record<string, string> = {
  dot: '#ce93d8', hot: '#66bb6a', stun: '#ffa726', buff: '#64b5f6', debuff: '#ef5350',
  slow: '#90a4ae', paralyze: '#ffcc80', freeze: '#80deea', sleep: '#b39ddb',
  confusion: '#f48fb1', blind: '#bdbdbd', vulnerability: '#ff8a65', anti_heal: '#e57373',
  thorns: '#a5d6a7', barrier: '#4fc3f7', evasion: '#b0bec5', haste: '#fff176', auto_revive: '#ffd54f',
}

function StatusEffectIcons({ effects }: { effects: ActiveStatusEffect[] }) {
  if (effects.length === 0) return null
  return (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap', mt: 0.5 }}>
      {effects.map((eff) => (
        <Tooltip key={eff.id} title={`${eff.name}${eff.description ? `: ${eff.description}` : ''} (${eff.remainingTurns} turns)`}>
          {eff.iconUrl ? (
            <Box
              component="img"
              src={eff.iconUrl}
              alt={eff.name}
              sx={{ width: STATUS_ICON_SIZE, height: STATUS_ICON_SIZE, borderRadius: '4px', border: `1px solid ${STATUS_EFFECT_COLORS[eff.kind] ?? '#666'}` }}
            />
          ) : (
            <Box sx={{
              width: STATUS_ICON_SIZE,
              height: STATUS_ICON_SIZE,
              borderRadius: '4px',
              bgcolor: STATUS_EFFECT_COLORS[eff.kind] ?? '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {eff.name.charAt(0).toUpperCase()}
            </Box>
          )}
        </Tooltip>
      ))}
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

// --- Active VFX entry types ---
interface ActiveWeaponFrame {
  key: number
  side: 'player' | 'creature'
  url: string
  fadeInMs: number
  /** When set, the component self-animates fade-out; when absent, stays until sequence end cleanup. */
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
}

interface ActiveProjectileEntry {
  key: number
  direction: 'left-to-right' | 'right-to-left'
  imageUrl: string | null
  from: ProjectilePos
  to: ProjectilePos
  trajectory: 'straight' | 'arc'
  durationMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  color: string
  show: boolean
}

interface ActiveImpactFrame {
  key: number
  side: 'player' | 'creature'
  url: string
  showMs: number
  vanishMs: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
}

interface ActiveBlockFrameEntry {
  key: number
  side: 'player' | 'creature'
  url: string
  showMs: number
  vanishMs: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
}

export default function CombatReplay({ combat, player, creature, victory, onFinish, leftCharacterId }: Props) {
  const [playerHp, setPlayerHp] = useState(player.maxHp)
  const [creatureHp, setCreatureHp] = useState(creature.maxHp)
  const [playerResourceCurrent, setPlayerResourceCurrent] = useState<number | null>(
    player.resource ? (player.resource.isGenerative ? 0 : player.resource.max) : null
  )
  const [creatureResourceCurrent, setCreatureResourceCurrent] = useState<number | null>(
    creature.resource ? (creature.resource.isGenerative ? 0 : creature.resource.max) : null
  )
  const [done, setDone] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(-1)
  const abortRef = useRef(false)
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)
  const playerCardRef = useRef<HTMLDivElement>(null)   // kept for potential future use
  const creatureCardRef = useRef<HTMLDivElement>(null) // kept for potential future use

  const playerId = leftCharacterId ?? combat.turns[0]?.events[0]?.sourceId ?? 'player'

  const [playerVariant, setPlayerVariant] = useState<string>('idle')
  const [creatureVariant, setCreatureVariant] = useState<string>('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)

  // Multi-frame VFX arrays
  const [activeWeaponFrames, setActiveWeaponFrames] = useState<ActiveWeaponFrame[]>([])
  const [activeProjectiles, setActiveProjectiles] = useState<ActiveProjectileEntry[]>([])
  const [activeImpactFrames, setActiveImpactFrames] = useState<ActiveImpactFrame[]>([])
  const [activeBlockFrames, setActiveBlockFrames] = useState<ActiveBlockFrameEntry[]>([])

  type DmgState = { value: number; type: CombatEventType; key: number; abilityName?: string } | null
  const [playerDmg, setPlayerDmg] = useState<DmgState>(null)
  const [creatureDmg, setCreatureDmg] = useState<DmgState>(null)
  const [playerStatusEffects, setPlayerStatusEffects] = useState<ActiveStatusEffect[]>([])
  const [creatureStatusEffects, setCreatureStatusEffects] = useState<ActiveStatusEffect[]>([])
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)

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
    events: CombatTurnEvent[],
    anim: AttackAnimationConfig,
  ) => {
    if (abortRef.current || events.length === 0) return
    const setAttackerVariant = attackerSide === 'player' ? setPlayerVariant : setCreatureVariant
    const setTargetImpact = attackerSide === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTargetVariant = attackerSide === 'player' ? setCreatureVariant : setPlayerVariant
    const frames = anim.frames

    // Step 1: Spend resource BEFORE the animation fires — standard gaming feel
    const hasResourceCost = events.some(ev => ev.type === 'resource_change' && ev.resourceAfter)
    if (hasResourceCost) {
      for (const ev of events) {
        if (ev.type === 'resource_change' && ev.resourceAfter) {
          const isPlayerSource = ev.sourceId === playerId
          if (isPlayerSource) setPlayerResourceCurrent(ev.resourceAfter.current)
          else setCreatureResourceCurrent(ev.resourceAfter.current)
        }
      }
      // Brief pause so the bar animation is visible before the ability fires
      await sleep(350)
      if (abortRef.current) return
    }

    // Step 2: Cast animation begins
    setAttackerVariant('cast')
    await sleep(160)

    // --- Weapon frames (all fired concurrently) ---
    const weaponFrames = (frames?.weapon ?? []).filter(f => f.url?.trim())
    if (weaponFrames.length > 0) {
      const maxWeaponMs = Math.max(...weaponFrames.map(f => (f.delayMs ?? 0) + (f.fadeInMs ?? 200)))
      weaponFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const entry: ActiveWeaponFrame = {
          key: ++vfxKeyRef.current,
          side: attackerSide,
          url: f.url!.trim(),
          fadeInMs: f.fadeInMs ?? 200,
          lifetimeMs: f.lifetimeMs,
          sizePx: f.sizePx,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: f.offsetX ?? 0,
          offsetY: f.offsetY ?? 0,
        }
        setActiveWeaponFrames(prev => [...prev, entry])
        if (f.lifetimeMs != null) {
          await sleep(f.lifetimeMs + 100)
          setActiveWeaponFrames(prev => prev.filter(e => e.key !== entry.key))
        }
      })
      await sleep(maxWeaponMs)
    }

    // Detect block events in this group
    const blockEvent = events.find(ev => ev.type === 'block' && ev.blocked)
    const isBlocked = !!blockEvent

    // --- Projectile frames ---
    const projFrames = frames?.projectile ?? []
    if (anim.projectile && projFrames.length > 0) {
      const srcRef = attackerSide === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = attackerSide === 'player' ? creaturePortraitRef : playerPortraitRef
      const tgtPos = getPortraitPos(tgtRef)
      const weaponUrlFallback = attackerSide === 'player' ? player.weaponUrl : creature.weaponUrl
      const dir = attackerSide === 'player' ? 'left-to-right' as const : 'right-to-left' as const
      const defaultFlight = (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
      const resolveFlightMs = (f: typeof projFrames[0]) => f.lifetimeMs ?? f.speedMs ?? defaultFlight
      const maxProjMs = Math.max(...projFrames.map(f => (f.delayMs ?? 0) + resolveFlightMs(f)))
      projFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const srcPos = getPortraitPos(srcRef)
        const key = ++vfxKeyRef.current
        const flightMs = resolveFlightMs(f)
        const entry: ActiveProjectileEntry = {
          key,
          direction: dir,
          imageUrl: f.url?.trim() ?? weaponUrlFallback ?? null,
          from: { x: srcPos.x + (f.offsetX ?? 0), y: srcPos.y + (f.offsetY ?? 0) },
          to: tgtPos,
          trajectory: f.trajectory,
          durationMs: flightMs,
          sizePx: f.sizePx,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          color: anim.impactColor,
          show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        await sleep(flightMs)
        setActiveProjectiles(prev => prev.map(p => p.key === key ? { ...p, show: false } : p))
        setTimeout(() => setActiveProjectiles(prev => prev.filter(p => p.key !== key)), 400)
      })
      await sleep(maxProjMs)
    }

    if (abortRef.current) return

    // --- Block frames (shown at defender portrait center when blocked) ---
    if (isBlocked && blockEvent) {
      const defenderSide: 'player' | 'creature' = attackerSide === 'player' ? 'creature' : 'player'
      const resolveBlockTiming = (f: AnimationBlockFrame) => {
        if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
        const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 800)
        return { showMs: Math.floor(lt * 0.4), vanishMs: Math.ceil(lt * 0.6) }
      }
      const blockAnimFrames = (blockEvent.blockAnimationFrames?.block ?? []).filter(f => f.url?.trim())
      if (blockAnimFrames.length > 0) {
        blockAnimFrames.forEach(async (f) => {
          if (f.delayMs) await sleep(f.delayMs)
          const { showMs, vanishMs } = resolveBlockTiming(f)
          const entry: ActiveBlockFrameEntry = {
            key: ++vfxKeyRef.current,
            side: defenderSide,
            url: f.url!.trim(),
            showMs,
            vanishMs,
            sizePx: f.sizePx,
            startSizePx: f.startSizePx,
            endSizePx: f.endSizePx,
            offsetX: f.offsetX ?? 0,
            offsetY: f.offsetY ?? 0,
          }
          setActiveBlockFrames(prev => [...prev, entry])
        })
      }

      // Show "Blocked" text on the defender side
      const isDefenderPlayer = defenderSide === 'player'
      dmgKeyRef.current++
      if (isDefenderPlayer) {
        setPlayerDmg({ value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Blocked!' })
      } else {
        setCreatureDmg({ value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Blocked!' })
      }

      const maxBlockMs = blockAnimFrames.length > 0
        ? Math.max(...blockAnimFrames.map(f => {
            const { showMs, vanishMs } = resolveBlockTiming(f)
            return (f.delayMs ?? 0) + showMs + vanishMs
          }))
        : 600
      await sleep(maxBlockMs)

      setActiveBlockFrames([])
      setAttackerVariant('return')
      await sleep(280)
      setAttackerVariant('idle')
      setPlayerDmg(null)
      setCreatureDmg(null)
      return
    }

    // --- Impact frames ---
    const impactFrames = (frames?.impact ?? []).filter(f => f.url?.trim())
    const resolveImpactTiming = (f: typeof impactFrames[0]) => {
      if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
      const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 600)
      return { showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) }
    }
    const maxImpactMs = impactFrames.length > 0
      ? Math.max(...impactFrames.map(f => {
          const { showMs, vanishMs } = resolveImpactTiming(f)
          return (f.delayMs ?? 0) + showMs + vanishMs
        }))
      : 350

    if (impactFrames.length > 0) {
      impactFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const { showMs, vanishMs } = resolveImpactTiming(f)
        const entry: ActiveImpactFrame = {
          key: ++vfxKeyRef.current,
          side: attackerSide === 'player' ? 'creature' : 'player',
          url: f.url!.trim(),
          showMs,
          vanishMs,
          sizePx: f.sizePx,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: f.offsetX ?? 0,
          offsetY: f.offsetY ?? 0,
        }
        setActiveImpactFrames(prev => [...prev, entry])
      })
    }

    // Combat events (damage/heal/execute) — split into target-side (shown at impact) and self-side
    // (lifesteal heal shown 200ms later so it reads: "hit enemy → drain life → heal self")
    const combatEvents = events.filter(ev => ev.type !== 'resource_change' && ev.type !== 'block')
    const targetEvents = combatEvents.filter(ev => ev.targetId !== ev.sourceId || ev.type !== 'heal')
    const selfHealEvents = combatEvents.filter(ev => ev.targetId === ev.sourceId && ev.type === 'heal')

    setTargetImpact(true)
    setTargetVariant('hit')
    for (const ev of targetEvents) {
      const isOnPlayer = ev.targetId === playerId
      dmgKeyRef.current++
      if (isOnPlayer) {
        setPlayerDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        setPlayerHp(Math.max(0, ev.targetHpAfter))
      } else {
        setCreatureDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        setCreatureHp(Math.max(0, ev.targetHpAfter))
      }
    }

    // Self-heals (lifesteal) shown 200ms after the hit for visual clarity
    if (selfHealEvents.length > 0) {
      sleep(200).then(() => {
        for (const ev of selfHealEvents) {
          const isOnPlayer = ev.targetId === playerId
          dmgKeyRef.current++
          if (isOnPlayer) {
            setPlayerDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
            setPlayerHp(Math.max(0, ev.targetHpAfter))
          } else {
            setCreatureDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
            setCreatureHp(Math.max(0, ev.targetHpAfter))
          }
        }
      })
    }

    await sleep(maxImpactMs)

    setActiveWeaponFrames([])
    setActiveImpactFrames([])
    setTargetImpact(false)
    setAttackerVariant('return')
    setTargetVariant('idle')
    await sleep(280)

    setAttackerVariant('idle')
    setPlayerDmg(null)
    setCreatureDmg(null)
  }, [playerId, player.weaponUrl, creature.weaponUrl, getPortraitPos])

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

        // Group consecutive events with the same sourceId+abilityId into one animation.
        // Block events (emitted by defender) are appended to the preceding attacker group.
        const groups: CombatTurnEvent[][] = []
        for (const ev of turn.events) {
          const prev = groups[groups.length - 1]
          if (ev.type === 'block' && prev && prev.length > 0) {
            prev.push(ev)
          } else if (prev && prev[0].sourceId === ev.sourceId && ev.abilityId && prev[0].abilityId === ev.abilityId) {
            prev.push(ev)
          } else {
            groups.push([ev])
          }
        }
        for (const group of groups) {
          if (abortRef.current) return
          // Pure resource_change groups (regen events with no abilityId) are handled by turn snapshot
          if (group.every(ev => ev.type === 'resource_change')) continue
          const attackerSide = group[0].sourceId === playerId ? 'player' : 'creature'
          const anim = attackerSide === 'player' ? playerAnim : creatureAnim
          await animateAttack(attackerSide, group, anim)
        }
        // Update status effects and resources after each turn
        const creatureId = combat.turns[0]?.events?.find(e => e.sourceId !== playerId)?.sourceId
          ?? combat.turns[0]?.events?.find(e => e.targetId !== playerId)?.targetId ?? ''
        if (turn.activeStatusEffects) {
          setPlayerStatusEffects(turn.activeStatusEffects[playerId] ?? [])
          setCreatureStatusEffects(turn.activeStatusEffects[creatureId] ?? [])
        }
        if (turn.resources) {
          if (turn.resources[playerId]) setPlayerResourceCurrent(turn.resources[playerId].current)
          if (turn.resources[creatureId]) setCreatureResourceCurrent(turn.resources[creatureId].current)
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
    setActiveWeaponFrames([])
    setActiveProjectiles([])
    setActiveImpactFrames([])
    setActiveBlockFrames([])
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
    // Jump resources to final state
    const lastTurn = combat.turns[combat.turns.length - 1]
    if (lastTurn?.resources) {
      const creatureId = combat.turns[0]?.events?.find(e => e.sourceId !== playerId)?.sourceId
        ?? combat.turns[0]?.events?.find(e => e.targetId !== playerId)?.targetId ?? ''
      if (lastTurn.resources[playerId]) setPlayerResourceCurrent(lastTurn.resources[playerId].current)
      if (lastTurn.resources[creatureId]) setCreatureResourceCurrent(lastTurn.resources[creatureId].current)
    }
    setCurrentTurn(lastTurn?.turnIndex ?? 0)
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

        {/* Projectile layer — all active projectiles */}
        <AnimatePresence>
          {activeProjectiles.map(p => (
            <Projectile
              key={p.key}
              show={p.show}
              color={p.color}
              direction={p.direction}
              id={p.key}
              weaponUrl={p.imageUrl}
              trajectory={p.trajectory}
              durationMs={p.durationMs}
              sizePx={p.sizePx}
              startSizePx={p.startSizePx}
              endSizePx={p.endSizePx}
              from={p.from}
              to={p.to}
            />
          ))}
        </AnimatePresence>

        {/* Player card */}
        <motion.div
          variants={playerVariants}
          animate={playerVariant}
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
        >
          <Paper
            ref={playerCardRef}
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: CARD_GAP, p: CARD_PADDING, pt: 0, borderRadius: CARD_RADIUS,
              bgcolor: '#14121f',
              borderColor: 'rgba(99,102,241,0.45)',
              boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.12)',
              position: 'relative', overflow: 'visible',
            }}
          >
            <Box ref={playerPortraitRef} sx={{ position: 'relative' }}>
              <Portrait url={player.portraitUrl} weaponUrl={player.weaponUrl} />
              {activeWeaponFrames.filter(f => f.side === 'player').map(f => (
                <WeaponFrame key={f.key} show url={f.url} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
              ))}
              {showPlayerImpact && activeImpactFrames.filter(f => f.side === 'player').length > 0
                ? activeImpactFrames.filter(f => f.side === 'player').map(f => (
                  <ImpactFrame key={f.key} show url={f.url} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
                ))
                : (
                  <ImpactEffect
                    show={showPlayerImpact}
                    style={'generic' as const}
                    color={creatureAnim.impactColor}
                    id={`p-impact-${dmgKeyRef.current}`}
                  />
                )
              }
              <AnimatePresence>
                {playerDmg && (
                  <DamageNumber value={playerDmg.value} type={playerDmg.type} id={playerDmg.key} abilityName={playerDmg.abilityName} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{player.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {player.level}</Typography>
            </Box>
            <HpBar current={playerHp} max={player.maxHp} />
            {player.resource && playerResourceCurrent !== null && (
              <ResourceBar current={playerResourceCurrent} max={player.resource.max} name={player.resource.name} colorHex={player.resource.colorHex} />
            )}
            <StatusEffectIcons effects={playerStatusEffects} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{player[key]}</Typography>
                </Box>
              ))}
            </Box>
            {activeBlockFrames.filter(f => f.side === 'player').map(f => (
              <BlockFrame key={f.key} show url={f.url} side="player" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
            ))}
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
            ref={creatureCardRef}
            variant="outlined"
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: CARD_GAP, p: CARD_PADDING, pt: 0, borderRadius: CARD_RADIUS,
              bgcolor: '#1a1414',
              borderColor: 'rgba(239,68,68,0.4)',
              boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.1)',
              position: 'relative', overflow: 'visible',
            }}
          >
            <Box ref={creaturePortraitRef} sx={{ position: 'relative' }}>
              <Portrait url={creature.portraitUrl} weaponUrl={creature.weaponUrl} />
              {activeWeaponFrames.filter(f => f.side === 'creature').map(f => (
                <WeaponFrame key={f.key} show url={f.url} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
              ))}
              {showCreatureImpact && activeImpactFrames.filter(f => f.side === 'creature').length > 0
                ? activeImpactFrames.filter(f => f.side === 'creature').map(f => (
                  <ImpactFrame key={f.key} show url={f.url} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
                ))
                : (
                  <ImpactEffect
                    show={showCreatureImpact}
                    style={'generic' as const}
                    color={playerAnim.impactColor}
                    id={`c-impact-${dmgKeyRef.current}`}
                  />
                )
              }
              <AnimatePresence>
                {creatureDmg && (
                  <DamageNumber value={creatureDmg.value} type={creatureDmg.type} id={creatureDmg.key} abilityName={creatureDmg.abilityName} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{creature.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {creature.level}</Typography>
            </Box>
            <HpBar current={creatureHp} max={creature.maxHp} />
            {creature.resource && creatureResourceCurrent !== null && (
              <ResourceBar current={creatureResourceCurrent} max={creature.resource.max} name={creature.resource.name} colorHex={creature.resource.colorHex} />
            )}
            <StatusEffectIcons effects={creatureStatusEffects} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{creature[key]}</Typography>
                </Box>
              ))}
            </Box>
            {activeBlockFrames.filter(f => f.side === 'creature').map(f => (
              <BlockFrame key={f.key} show url={f.url} side="creature" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
            ))}
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
